/**
 * Implementation of the binary-tree method for
 * efficient paired comparions "Efficient method
 * for paired comparison", Silverstein & Farrell
 * Journal of Electronic Imaging (2001) 10(2), 394–398
 *
 * This algorithm was used for aesthethics comparisons
 * "Evaluating the Effectiveness of Color to Convey
 * Alignment Quality in Macromolecular Structures"
 * Heinrich, Kaur, O'Donoghue (2015) Big Data Visual
 * Analytics
 *
 * This implementation written by (c) 2017 Bosco K. Ho,
 * based on the work of Tylor Stewart
 */


const _ = require('lodash')
const util = require('./util')


function newNode (i, iImage, left, right, parent) {
  return {i, iImage, left, right, parent}
}


/**
 * Initialize the binary choice tree with all associated parameters
 * required to keep track of the tree, repeats and user statistics
 *
 * @param imageUrls
 * @returns {{imageUrls: *, nodes: [null], iNodeRoot: number, iNodeCompare: number, testImageIndices: *, iImageTest, probRepeat: number, totalRepeat: number, fractions: Array, ranks: Array, comparisons: Array, comparisonIndices: Array, repeatComparisonIndices: Array, consistencies: Array}}
 */
function newState (imageUrls) {
  let probRepeat = 0.2

  let nImage = imageUrls.length
  let maxNComparison = Math.floor(nImage * Math.log2(nImage))
  let totalRepeat = Math.ceil(maxNComparison * probRepeat)
  console.log('> tree.newState',
    'maxNComparison', maxNComparison,
    'nImage', nImage,
    'totalRepeat', totalRepeat)

  let testImageIndices = _.shuffle(_.range(nImage))
  let rootNodeImageIndex = testImageIndices.shift()
  let iImageTest = testImageIndices.shift()

  let iNodeRoot = 0
  let nodes = [newNode(iNodeRoot, rootNodeImageIndex, null, null, null)]

  return {
    imageUrls, // list of image-url's that will be ranked
    probRepeat, // how likely a comparison will be repeated
    nodes, // list of nodes in the binary search tree
    iNodeRoot, // index to the root node, can change with re-balancing
    iImageTest, // index to the url of the image to test, undefined if done
    testImageIndices, // remaining iImageTest to test
    totalRepeat, // total number of repeats to be conducted
    iNodeCompare: iNodeRoot, // index to Node containing compare image                                     // compare with iImageTest
    comparisons: [], // list of all comparisons made by the participant
    comparisonIndices: [], // indices to comparisons made that have not been repeated
    iComparisonRepeat: null, // index to comparison being repeated
    repeatComparisonIndices: [], // indices to repeated comparisons

    // the following are only calculated when done
    consistencies: [], // list of (0, 1) for consistency of repeated comparisons                       // with the original choice and the repeated choice
    fractions: [], // list of number of winning votes for each image-url
    ranks: [], // ranked list of the image-url for user preference
  }
}


/**
 * Sorts the nodes into an ordered list based on
 * the position in the binary tree with left-most
 * first
 *
 * @param state
 * @returns {Array} of nodes
 */
function getOrderedNodeList (state) {
  let sortedNodes = []

  function storeRank (iNode) {
    if (iNode !== null) {
      storeRank(state.nodes[iNode].left)
      sortedNodes.push(state.nodes[iNode])
      storeRank(state.nodes[iNode].right)
    }
  }

  storeRank(state.iNodeRoot)
  return sortedNodes
}


/**
 * Balances the binary tree represented by the order of
 * the sorted nodes and returns the root node of the
 * new tree
 *
 * @param {Array} of sorted nodes
 * @returns {node} the root node of the re-balanced tree
 */
function balanceSubTree (sortedNodes) {
  const nNode = sortedNodes.length
  if (nNode == 0) {
    return null
  }

  const iMidNode = Math.floor(nNode / 2)
  let leftNodes = sortedNodes.slice(0, iMidNode)
  let midNode = sortedNodes[iMidNode]
  let rightNodes = sortedNodes.slice(iMidNode + 1, nNode + 1)

  let leftChildNode = balanceSubTree(leftNodes)
  let rightChildNode = balanceSubTree(rightNodes)
  if (leftChildNode !== null) {
    midNode.left = leftChildNode.i
    leftChildNode.parent = midNode.i
  } else {
    midNode.left = null
  }
  if (rightChildNode !== null) {
    midNode.right = rightChildNode.i
    rightChildNode.parent = midNode.i
  } else {
    midNode.right = null
  }

  return midNode
}


function insertNewNode (state) {
  let iNewNode = state.nodes.length
  let node = newNode(iNewNode, state.iImageTest, null, null, state.iNodeCompare)
  state.nodes.push(node)
  return iNewNode
}


function getNextImage (state) {
  // undefined if testImageIndices is empty
  state.iImageTest = state.testImageIndices.shift()

  // rebalance the tree
  let sortedNodes = getOrderedNodeList(state)
  let newRootNode = balanceSubTree(sortedNodes)
  newRootNode.parent = null
  state.iNodeRoot = newRootNode.i
  state.iNodeCompare = state.iNodeRoot

  console.log('>> tree.resetTreeForNewTestImage ===>',
    'iNodeRoot', state.iNodeRoot,
    'iNodeCompare', state.iNodeCompare,
    'iImageTest', state.iImageTest,
    state.testImageIndices)

  console.log('> tree.getNextImage consistency', checkNodes(state.nodes))

}


function setNextRepeatComparison (state) {

  state.iComparisonRepeat = null

  if (state.repeatComparisonIndices.length < state.totalRepeat) {
    if (state.comparisonIndices.length > 0) {
      state.comparisonIndices = _.shuffle(state.comparisonIndices)
      state.iComparisonRepeat = state.comparisonIndices.shift()
      state.repeatComparisonIndices.push(state.iComparisonRepeat)
    }
  }
}


/**
 * Checks for the consistency of the binary tree in terms of
 * 1. one root node
 * 2. parent indices match
 * 3. children indices match
 *
 * @param nodes
 * @returns {boolean}
 */
function checkNodes (nodes) {
  let nNullParent = 0
  let pass = true
  for (let node of nodes) {

    if (node.parent === null) {
      nNullParent += 1
    } else {
      // check parent
      let parent = nodes[node.parent]
      if ((parent.left !== node.i) && (parent.right !== node.i)) {
        pass = false
      }
    }

    // check children
    for (let iChildNode of [node.left, node.right]) {
      if (iChildNode !== null) {
        if (iChildNode >= nodes.length) {
          pass = false
        } else {
          child = nodes[iChildNode]
          if (child.parent !== node.i) {
            pass = false
          }
        }
      }
    }

  }

  // check for a unique root
  if (nNullParent !== 1) {
    pass = false
  }

  return pass
}


function makeChoice (state, comparison) {

  let compareNode = state.nodes[state.iNodeCompare]

  if (comparison.isRepeat) {

    let i = state.iComparisonRepeat
    state.comparisons[i].repeat = comparison.repeat
    setNextRepeatComparison(state)

  } else {

    let chosenImageIndex = comparison.choice

    console.log('>> tree.makeChoice',
      'iNodeRoot', state.iNodeRoot,
      'iNodeCompare', state.iNodeCompare,
      'iImageTest', state.iImageTest,
      '- chosenImageIndex', chosenImageIndex)

    // go right branch if iImageTest is chosen (preferred)
    if (chosenImageIndex === state.iImageTest) {
      if (compareNode.right === null) {
        compareNode.right = insertNewNode(state)
        getNextImage(state)
      } else {
        state.iNodeCompare = compareNode.right
      }
    } else {
      if (compareNode.left === null) {
        compareNode.left = insertNewNode(state)
        getNextImage(state)
      } else {
        state.iNodeCompare = compareNode.left
      }
    }

    let iComparisonNew = state.comparisons.length
    state.comparisons.push(comparison)
    state.comparisonIndices.push(iComparisonNew)

    if (state.iComparisonRepeat === null) {
      setNextRepeatComparison(state)
    }

    console.log(state.nodes)

  }
}


function makeComparison (state, iImageA, iImageB) {
  return {
    itemA: {value: iImageA, url: state.imageUrls[iImageA]},
    itemB: {value: iImageB, url: state.imageUrls[iImageB]},
    choice: null,
    isRepeat: false,
    repeat: null
  }
}


function isAllImagesTested (state) {
  return (state.testImageIndices.length === 0)
    && _.isUndefined(state.iImageTest)
}


function isAllRepeatComparisonsMade (state) {
  return (state.repeatComparisonIndices.length === state.totalRepeat)
    && (state.iComparisonRepeat === null)
}


function isDone (state) {

  if (!isAllImagesTested(state)) {
    return false
  }

  if (!isAllRepeatComparisonsMade(state)) {
    return false
  }

  if (state.consistencies.length === 0) {
    state.consistencies = _.map(state.repeatComparisonIndices, i => {
      let comparison = state.comparisons[i]
      if (comparison.choice === comparison.repeat) {
        return 1
      } else {
        return 0
      }
    })
    console.log('> tree.isDone consistencies', state.consistencies)
  }

  if (state.ranks.length === 0) {
    let sortedNodes = getOrderedNodeList(state)
    state.ranks = _.map(sortedNodes, node => state.imageUrls[node.iImage])
    console.log('> tree.isDone sorted nodes', sortedNodes)
    console.log('> tree.isDone ranks', state.ranks)
  }

  if (state.fractions.length === 0) {
    let nImage = state.imageUrls.length
    let seen = util.makeArray(nImage, 0)
    let chosen = util.makeArray(nImage, 0)
    for (let comparison of state.comparisons) {
      chosen[comparison.choice] += 1
      seen[comparison.itemA.value] += 1
      seen[comparison.itemB.value] += 1
    }
    state.fractions = _.map(_.range(nImage), i => chosen[i] / seen[i])
    console.log('> tree.isDone fractions', state.fractions)
  }

  return true

}


function getComparison (state) {

  let doRepeatComparison = false
  if (isAllImagesTested(state)) {
    doRepeatComparison = true
  } else {
    if (state.iComparisonRepeat !== null) {
      if (Math.random() <= state.probRepeat) {
        doRepeatComparison = true
      }
    }
  }

  if (doRepeatComparison) {

    let comparison = state.comparisons[state.iComparisonRepeat]
    comparison.isRepeat = true
    return comparison

  } else {

    // get comparison from tree
    let node = state.nodes[state.iNodeCompare]
    return makeComparison(state, state.iImageTest, node.iImage)

  }
}


module.exports = {
  isDone,
  newState,
  makeChoice,
  getComparison,
}



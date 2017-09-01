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


function getLastIndex (l) {
  return l.length - 1
}


function newNode (index, imageIndex, left, right, parent) {
  return {index, imageIndex, left, right, parent}
}


/**
 * Initialize the binary choice tree with all associated parameters
 * required to keep track of the tree, repeats and user statistics
 *
 * @param urls
 * @returns {{urls: *, nodes: [null], rootNodeIndex: number, testNodeIndex: number, untestedImageIndices: *, newImageIndex, fractionToRepeat: number, maxNRepeat: number, fractions: Array, ranks: Array, comparisons: Array, comparisonIndices: Array, repeatedComparisonIndices: Array, consistencies: Array}}
 */
function newState (urls) {
  let fractionToRepeat = 0.2

  let nImage = urls.length
  let maxNComparison = Math.floor(nImage * Math.log2(nImage))
  let nMaxRepeat = Math.ceil(maxNComparison * fractionToRepeat)

  let untestedImageIndices = _.shuffle(_.range(nImage))
  let rootNodeImageIndex = untestedImageIndices.shift()
  let newImageIndex = untestedImageIndices.shift()

  let rootNodeIndex = 0
  let nodes = [newNode(rootNodeIndex, rootNodeImageIndex, null, null, null)]

  return {
    urls,
    nodes,
    rootNodeIndex, // can change with re-balancing
    testNodeIndex: rootNodeIndex, // contains imageIndex to compare with new image
    untestedImageIndices,
    newImageIndex,
    fractionToRepeat: fractionToRepeat,
    maxNRepeat: nMaxRepeat,
    fractions: [],
    ranks: [],
    comparisons: [],
    comparisonIndices: [],
    repeatedComparisonIndices: [],
    consistencies: [],
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

  function storeRank (nodeIndex) {
    if (nodeIndex !== null) {
      storeRank(state.nodes[nodeIndex].left)
      sortedNodes.push(state.nodes[nodeIndex])
      storeRank(state.nodes[nodeIndex].right)
    }
  }

  storeRank(state.rootNodeIndex)
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
    midNode.left = leftChildNode.index
    leftChildNode.parent = midNode.index
  } else {
    midNode.left = null
  }
  if (rightChildNode !== null) {
    midNode.right = rightChildNode.index
    rightChildNode.parent = midNode.index
  } else {
    midNode.right = null
  }

  return midNode
}


function insertNewNode (state) {

  // create new node for newImageIndex
  let iNewNode = state.nodes.length
  let node = newNode(iNewNode, state.newImageIndex, null, null, state.testNodeIndex)
  state.nodes.push(node)

  // rebalance the tree
  let sortedNodes = getOrderedNodeList(state)
  let newRootNode = balanceSubTree(sortedNodes)
  newRootNode.parent = null
  state.rootNodeIndex = newRootNode.index
  state.testNodeIndex = state.rootNodeIndex

  // get new Image
  state.newImageIndex = state.untestedImageIndices.shift()

  console.log('>> tree.resetTreeForNewTestImage ===>',
    'rootNodeIndex', state.rootNodeIndex,
    'testNodeIndex', state.testNodeIndex,
    'newImageIndex', state.newImageIndex,
    state.untestedImageIndices)

  return iNewNode
}


/**
 * Generates a unique number for the (unordered) pair of values
 *
 * @param comparison
 * @returns {Number}
 */
function getCantorPairingNumber(comparison) {
  let x = [comparison.itemA.value, comparison.itemB.value]
  x.sort()
  return 0.5*(x[0] + x[1])*(x[0] + x[1] + 1) + x[1]
}


function makeChoice (state, comparison) {

  let testNode = state.nodes[state.testNodeIndex]

  if (comparison.isRepeat) {
    let p = getCantorPairingNumber(comparison)
    let i = _.findIndex(state.comparisons, c => {
      return getCantorPairingNumber(c) === p
    })
    state.comparisons[i].repeat = comparison.repeat
    console.log('> tree.makeChoice update i', i, _.last(state.repeatedComparisonIndices))
    console.log('> tree.makeChoice update comparison', state.comparisons[i])
  } else {
    let chosenImageIndex = comparison.choice

    console.log('>> tree.makeChoice',
      'rootNodeIndex', state.rootNodeIndex,
      'testNodeIndex', state.testNodeIndex,
      'newImageIndex', state.newImageIndex,
      '- chosenImageIndex', chosenImageIndex)

    // go right branch if newImageIndex is chosen (preferred)
    if (chosenImageIndex === state.newImageIndex) {
      if (testNode.right === null) {
        testNode.right = insertNewNode(state)
      } else {
        state.testNodeIndex = testNode.right
      }
    } else {
      if (testNode.left === null) {
        testNode.left = insertNewNode(state)
      } else {
        state.testNodeIndex = testNode.left
      }
    }

    state.comparisons.push(comparison)
    state.comparisonIndices.push(getLastIndex(state.comparisons))

    console.log(state.nodes)
  }
}


function makeComparison (state, imageIndexA, imageIndexB) {
  return {
    itemA: {value: imageIndexA, url: state.urls[imageIndexA]},
    itemB: {value: imageIndexB, url: state.urls[imageIndexB]},
    choice: null,
    isRepeat: false,
    repeat: null
  }
}


function isAllImagesTested(state) {
  return (state.untestedImageIndices.length === 0)
           && _.isUndefined(state.newImageIndex)
}


function isDone (state) {

  if (!isAllImagesTested(state)) {
    return false
  }

  if (state.repeatedComparisonIndices.length < state.maxNRepeat) {
    return false
  }

  if (state.consistencies.length === 0) {
    console.log('> tree.isDone comparisons', state.comparisons)
    state.consistencies = _.map(state.repeatedComparisonIndices, i => {
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
    state.ranks = _.map(
      getOrderedNodeList(state),
      node => state.urls[node.imageIndex])
  }

  if (state.fractions.length === 0) {
    let nImage = state.urls.length
    let seen = util.makeArray(nImage, 0)
    let chosen = util.makeArray(nImage, 0)
    for (let comparison of state.comparisons) {
      chosen[comparison.choice] += 1
      seen[comparison.itemA.value] += 1
      seen[comparison.itemB.value] += 1
    }
    state.fractions = _.map(_.range(nImage), i => chosen[i] / seen[i])
    console.log('> tree.isDone picked', chosen)
    console.log('> tree.isDone voted', seen)
    console.log('> tree.isDone fractions', state.fractions)
  }

  return true

}


function getComparison (state) {
  let isBernoulli = Math.random() <= state.fractionToRepeat
  let hasUntestedComparison = state.comparisonIndices.length > 0
  let hasRepeatsToDo = state.repeatedComparisonIndices.length < state.maxNRepeat
  let doRepeat = isBernoulli && hasUntestedComparison && hasRepeatsToDo

  if (doRepeat || isAllImagesTested(state)) {
    let iComparison = state.comparisonIndices.shift()
    state.repeatedComparisonIndices.push(iComparison)
    let comparison = state.comparisons[iComparison]
    comparison.isRepeat = true
    return comparison
  } else {
    let iNewImage = state.newImageIndex
    let iTestNodeImage = state.nodes[state.testNodeIndex].imageIndex
    return makeComparison(state, iTestNodeImage, iNewImage)
  }
}


module.exports = {
  isDone,
  newState,
  makeChoice,
  getComparison,
}



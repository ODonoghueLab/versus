/**
 * @fileoverview Implementation of the binary-tree method for
 * efficient paired comparisons "Efficient method
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
 *
 * The entire state is stored in a JSON-literal that is
 * passed around to the different function. This allows
 * an the state to be easily stored in a JSON filed in
 * a database, and to be transferred as JSON in a web-call.
 */

const _ = require('lodash')
const util = require('./util')

/**
 * Creates a new node, defined by its index i
 */
function newNode (i, iImage, left, right, parent) {
  return {i, iImage, left, right, parent}
}

/**
 * Initialize the binary choice tree with all associated parameters
 * required to keep track of the tree, repeats and user statistics
 * @param {Array<String>} imageUrls
 * @returns {Object} State of the binary-choice-tree
 */
function newState (imageUrls, probRepeat) {
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
    iImageTest, // index to the url of the image to test, null if done
    testImageIndices, // remaining iImageTest to test
    totalRepeat, // total number of repeats to be conducted
    iNodeCompare: iNodeRoot, // index to Node containing compare image
    comparisons: [], // list of all comparisons made by the participant
    comparisonIndices: [], // indices to comparisons made that have not been repeated
    iComparisonRepeat: null, // index to comparison being repeated
    repeatComparisonIndices: [], // indices to repeated comparisons

    // the following are only calculated when done
    fractions: [], // list of number of winning votes for each image-url
    rankedImageUrls: [], // ranked list of the image-url for user preference
  }
}

function getNewStates (experiment) {
  states = {}
  const urls = _.map(experiment.images, 'url')
  for (let imageSetId of experiment.attr.imageSetIds) {
    let theseUrls = _.filter(urls, u => util.extractId(u) === imageSetId)
    states[imageSetId] = newState(theseUrls, experiment.attr.probRepeat)
  }
  return states
}

/**
 * Creates a comparison data structure that will be sent to
 * web-client and stored in a state
 * @param {Object} state
 * @param {Number} iImageA
 * @param {Number} iImageB
 * @returns {Object} comparison
 */
function makeComparison (state, iImageA, iImageB) {
  return {
    itemA: {value: iImageA, url: state.imageUrls[iImageA]},
    itemB: {value: iImageB, url: state.imageUrls[iImageB]},
    choice: null,
    isRepeat: false,
    repeat: null,
    startTime: util.getCurrentTimeStr(),
    endTime: null,
    repeatStartTime: null,
    repeatEndTime: null
  }
}

/**
 * Sorts the nodes into an ordered list based on
 * the position in the binary tree with left-most
 * first
 * @param {Object} state - JSON literal
 * @returns {Array} of nodes sorted in order
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
 * new tree. Balancing the tree involves setting up
 * the appropriate left/right children and parent pointers
 * where the root node's parent is null
 *
 * @param {Array<Node>} sortedNodes - sorted nodes
 * @returns {Object} the root node of the re-balanced tree
 */
function balanceSubTree (sortedNodes) {
  const nNode = sortedNodes.length
  if (nNode === 0) {
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

/**
 * Creates a new node based on the current image being tested
 * @param {Object} state
 * @returns {Number} index to the new node in state
 */
function insertNewNode (state) {
  let iNewNode = state.nodes.length
  let node = newNode(
    iNewNode, state.iImageTest, null, null, state.iNodeCompare)
  state.nodes.push(node)
  return iNewNode
}

function getNextImage (state) {
  state.iImageTest = state.testImageIndices.shift()
  if (_.isUndefined(state.iImageTest)) {
    state.iImageTest = null
  }

  // Re-balance the tree
  let sortedNodes = getOrderedNodeList(state)
  let newRootNode = balanceSubTree(sortedNodes)
  newRootNode.parent = null
  state.iNodeRoot = newRootNode.i
  state.iNodeCompare = state.iNodeRoot

  console.log('> tree.getNextImage ===>',
    'iNodeRoot', state.iNodeRoot,
    'iNodeCompare', state.iNodeCompare,
    'iImageTest', state.iImageTest,
    state.testImageIndices)

  console.log('> tree.getNextImage nConsistentAnswer', checkNodes(state.nodes))
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
 * Checks the nConsistentAnswer of the binary tree in terms of
 * 1. one root node;
 * 2. parent indices match
 * 3. children indices match
 *
 * @param {array<node>} nodes as defined in newNode()
 * @returns {boolean} true if binary tree is consistent
 */
function checkNodes (nodes) {
  let nNullParent = 0
  let pass = true
  for (let node of nodes) {
    if (node.parent === null) {
      nNullParent += 1
    } else {
      // Checks children point to node correctly
      let parent = nodes[node.parent]
      if ((parent.left !== node.i) && (parent.right !== node.i)) {
        pass = false
      }
    }

    // Checks children points to node correctly
    for (let iChildNode of [node.left, node.right]) {
      if (iChildNode !== null) {
        if (iChildNode >= nodes.length) {
          pass = false
        } else {
          let child = nodes[iChildNode]
          if (child.parent !== node.i) {
            pass = false
          }
        }
      }
    }
  }

  // Check tree has one unique root
  if (nNullParent !== 1) {
    pass = false
  }

  return pass
}

function makeChoice (states, comparison) {
  let urlA = comparison.itemA.url
  let imageSetId = util.extractId(urlA)
  let state = states[imageSetId]
  if (comparison.isRepeat) {
    let i = state.iComparisonRepeat
    state.comparisons[i].repeat = comparison.repeat
    state.comparisons[i].repeatEndTime = util.getCurrentTimeStr()
    setNextRepeatComparison(state)
  } else {
    let compareNode = state.nodes[state.iNodeCompare]
    let chosenImageIndex = comparison.choice

    console.log('> twochoice.makeChoice',
      'iNodeRoot', state.iNodeRoot,
      'compareNode.iImage', compareNode.iImage,
      'iImageTest', state.iImageTest,
      '- chosenImageIndex', chosenImageIndex)

    // Go right branch if iImageTest is chosen (preferred)
    if (chosenImageIndex === state.iImageTest) {
      if (compareNode.right === null) {
        compareNode.right = insertNewNode(state)
        getNextImage(state)
      } else {
        state.iNodeCompare = compareNode.right
      }
    } else {
      // Else left branch if image at node is chosen (preferred)
      if (compareNode.left === null) {
        compareNode.left = insertNewNode(state)
        getNextImage(state)
      } else {
        state.iNodeCompare = compareNode.left
      }
    }

    comparison.endTime = util.getCurrentTimeStr()
    let iComparisonNew = state.comparisons.length
    state.comparisons.push(comparison)
    state.comparisonIndices.push(iComparisonNew)

    if (state.iComparisonRepeat === null) {
      setNextRepeatComparison(state)
    }
  }
}

function isAllImagesTested (state) {
  return (state.testImageIndices.length === 0) &&
    (state.iImageTest === null)
}

function isAllRepeatComparisonsMade (state) {
  return (state.repeatComparisonIndices.length === state.totalRepeat) &&
    (state.iComparisonRepeat === null)
}

/**
 * Checks that the choices in each individual comparison are
 * consistent with the final sorted list generated from the binary tree
 * @param {Object} state - the binary tree state
 * @returns {boolean} - true if comparisons are consistent
 */
function checkComparisons (state) {
  let sortedImages = _.map(getOrderedNodeList(state), n => n.iImage)
  let getRank = iImage => _.indexOf(sortedImages, iImage)
  for (let comparison of state.comparisons) {
    let iImageA = comparison.itemA.value
    let iImageB = comparison.itemB.value
    let iImageBetter = comparison.choice
    let iImageWorse = iImageBetter === iImageA ? iImageB : iImageA
    let consistent = getRank(iImageWorse) < getRank(iImageBetter)
    if (!consistent) {
      return false
    }
  }
  return true
}

function isDone (state) {
  if (!isAllImagesTested(state)) {
    return false
  }

  if (!isAllRepeatComparisonsMade(state)) {
    return false
  }

  if (state.rankedImageUrls.length === 0) {
    let sortedNodes = getOrderedNodeList(state)
    let urls = _.map(sortedNodes, node => state.imageUrls[node.iImage])
    state.rankedImageUrls = urls
    console.log('> twochoice.isDone sort urls', sortedNodes, urls)
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
  }

  let result = checkComparisons(state)
  console.log('> twochoice.isDone checkComparisons', result)

  return true
}

function updateStatesToAttr (participant, experimentAttr) {
  let attr = participant.attr
  let states = participant.states

  attr.nAnswer = 0
  attr.nRepeatAnswer = 0
  attr.nConsistentAnswer = 0
  attr.time = 0
  for (let state of _.values(states)) {
    for (let comparison of state.comparisons) {
      attr.time += util.getTimeInterval(comparison)
      attr.nAnswer += 1
      if (comparison.repeat !== null) {
        attr.nAnswer += 1
        attr.nRepeatAnswer += 1
        if (comparison.choice === comparison.repeat) {
          attr.nConsistentAnswer += 1
        }
      }
    }
  }
  attr.progress = attr.nAnswer / experimentAttr.nQuestion * 100

  attr.isDone = true
  for (let state of _.values(states)) {
    if (!isDone(state)) {
      attr.isDone = false
    }
  }

  if (attr.isDone) {
    attr.status = 'done'
  } else if (attr.user === null) {
    attr.status = 'start'
  } else {
    attr.status = 'running'
  }
}

function getComparison (state, probRepeat) {
  let doRepeatComparison = false

  if (isAllImagesTested(state)) {
    doRepeatComparison = true
  } else {
    if (state.iComparisonRepeat !== null) {
      // Here is the random probability to do a repeat
      if (Math.random() <= probRepeat) {
        doRepeatComparison = true
      }
    }
  }

  if (doRepeatComparison) {
    let comparison = state.comparisons[state.iComparisonRepeat]
    comparison.isRepeat = true
    if (comparison.repeatStartTime === null) {
      comparison.repeatStartTime = util.getCurrentTimeStr()
    }
    return comparison
  } else {
    // get comparison from tree
    let node = state.nodes[state.iNodeCompare]
    let comparison = makeComparison(state, state.iImageTest, node.iImage)
    if (comparison.startTime === null) {
      comparison.startTime = util.getCurrentTimeStr()
    }
    return comparison
  }
}

function getExperimentAttr (urls, probRepeat) {
  let attr = {
    probRepeat,
    nImage: 0,
    nQuestionMax: 0,
    nRepeatQuestionMax: 0,
  }

  let imageSetIds = []
  let nImageById = {}
  for (let path of urls) {
    let imageSetId = util.extractId(path)
    if (!_.includes(imageSetIds, imageSetId)) {
      imageSetIds.push(imageSetId)
      nImageById[imageSetId] = 0
    }
    nImageById[imageSetId] += 1
  }

  attr.imageSetIds = imageSetIds

  for (let n of _.values(nImageById)) {
    let nQuestion = Math.ceil(n * Math.log2(n))
    let nRepeat = Math.ceil(attr.probRepeat * nQuestion)
    attr.nImage += n
    attr.nQuestionMax += nQuestion
    attr.nRepeatQuestionMax += nRepeat
  }

  attr.nQuestion = attr.nQuestionMax + attr.nRepeatQuestionMax

  return attr
}

function getRandomUnfinishedState (states) {
  let choices = []
  for (let [id, state] of _.toPairs(states)) {
    if (!isDone(state)) {
      _.times(
        state.imageUrls.length,
        () => { choices.push(id) })
    }
  }
  let id = choices[_.random(choices.length - 1)]
  return states[id]
}

function getChoices (experiment, participant) {
  let states = participant.states
  let probRepeat = experiment.attr.probRepeat
  let comparison = getComparison(getRandomUnfinishedState(states), probRepeat)
  let choices = []
  for (let item of [comparison.itemA, comparison.itemB]) {
    let chosenComparison = _.cloneDeep(comparison)
    if (chosenComparison.isRepeat) {
      chosenComparison.repeat = item.value
    } else {
      chosenComparison.choice = item.value
    }
    choices.push({
      url: item.url,
      comparison: chosenComparison
    })
  }
  return choices
}

module.exports = {
  getNewStates,
  makeChoice,
  getExperimentAttr,
  updateStatesToAttr,
  getChoices
}
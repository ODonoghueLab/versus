

function newNode(imageIndex, left, right) {
  return { imageIndex, left, right };
}

function newState(imageUrls) {
  return {
    testImageIndex: 1, // currently testing this imageIndex
    nodeIndex: 0, // node to compare to test imageIndex
    nodes: [newNode(0, null, null)],
    ranks: [],
    urls: imageUrls
  }
}

function makeChoice(state, isTestImageChosen) {
  // state.testImageIndex is always larger than all previously seen imageIndex's
  // so if chosenImageIndex is larger than tree.testImageIndex, this mean 
  // state.testImageIndex was chosen, therefore the new image is better
  console.log('tree update', state.testImageIndex, state.nodeIndex, state.nodes);
  if (isTestImageChosen) {
    // Right branch holds nodes to better imageIndex's
    if (state.nodes[state.nodeIndex].right == null) {
      // Insert Node
      state.nodes[state.nodeIndex].right = state.nodes.length;
      state.nodes[state.nodes.length] = newNode(state.testImageIndex, null, null);
      state.nodeIndex = 0;
      state.testImageIndex += 1; // choose new image
    } else {
      // Traverse Tree
      state.nodeIndex = state.nodes[state.nodeIndex].right;
    }
  } else {
    // Left branch holds nodes to worse imageIndex's
    if (state.nodes[state.nodeIndex].left == null) {
      // Insert Node
      state.nodes[state.nodeIndex].left = state.nodes.length;
      state.nodeIndex = 0;
      state.nodes[state.nodes.length] = newNode(state.testImageIndex, null, null);
      state.testImageIndex += 1; // load new image
    } else {
      // Traverse Tree
      state.nodeIndex = state.nodes[state.nodeIndex].left;
    }
  }
}

function makeComparison(state, imageIndexA, imageIndexB) {
  return {
    itemA: { value: imageIndexA, url: state.urls[imageIndexA] },
    itemB: { value: imageIndexB, url: state.urls[imageIndexB] },
  }
}

function rankNodes(state) {
  // Perform Pre Order Search
  // binary search with the deepest right branch
  // stored in ranks first
  let ranks = [];
  function storeRank(nodeIndex) {
    if (typeof state.nodes[nodeIndex] !== typeof undefined) {
      storeRank(state.nodes[nodeIndex].right);
      ranks.push(state.urls[state.nodes[nodeIndex].imageIndex]);
      storeRank(state.nodes[nodeIndex].left);
    }
  }
  storeRank(0);
  state.ranks = ranks;
}

module.exports = { newState, newNode, makeChoice, makeComparison, rankNodes }
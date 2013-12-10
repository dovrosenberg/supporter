updateScore = function (collection, item, forceUpdate) {
  var forceUpdate = typeof forceUpdate !== 'undefined' ? forceUpdate : false;
  // For performance reasons, the database is only updated if the difference between the old score and the new score
  // is meaningful enough. To find out, we calculate the "power" of a single vote after n days.
  // We assume that after n days, a single vote will not be powerful enough to affect posts' ranking order.
  // Note: sites whose posts regularly get a lot of votes can afford to use a lower n. 

  // n =  number of days after which a single vote will not have a big enough effect to trigger a score update
  //      and posts can become inactive
  var n = 30;
  // x = score increase amount of a single vote after n days (for n=100, x=0.000040295)
  var x = 1/Math.pow(n*24+2,1.3);
  // time decay factor
  var f = 1.3;

  // use submitted timestamp if available, else (for pending posts) calculate score using createdAt
  var age = item.submitted || item.createdAt;

  // use baseScore if defined, if not just use the number of votes
  // note: for transition period, also use votes if there are more votes than baseScore
  // var baseScore = Math.max(item.votes || 0, item.baseScore || 0);
  // Rank them by the number of people that starred it
  // or Rank them by if the current user has starred it
  var star, _ref,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  var star = Needs.find({
    _id: item._id
  }).starUsers && Needs.findOne({
    _id: item._id
  }).starUsers.length > 0 && (_ref = Meteor.user()._id, __indexOf.call(Needs.findOne({
    _id: item._id
  }).starUsers, _ref) >= 0);
  
  var baseScore = star != null ? star.Count : 1
  //var baseScore = item.starUsers.Count;

  // now multiply by 'age' exponentiated
  // FIXME: timezones <-- set by server or is getTime() ok?
  var ageInHours = (new Date().getTime() - age) / (60 * 60 * 1000);

  // HN algorithm
  var newScore = baseScore / Math.pow(ageInHours + 2, f);

  // Note: before the first time updateScore runs on a new item, its score will be at 0
  var scoreDiff = Math.abs(item.score - newScore);

  // only update database if difference is larger than x to avoid unnecessary updates
  if (forceUpdate || scoreDiff > x){
    collection.update(item._id, {$set: {score: newScore, inactive: false}});
    return 1;
  }else if(ageInHours > n*24){
    // only set a post as inactive if it's older than n days
    collection.update(item._id, {$set: {inactive: true}});
  }
  return 0;
};
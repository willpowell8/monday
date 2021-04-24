const { MessageFactory } = require('botbuilder');
const monday = require("../monday.js");
const { ActionTypes } = require('botframework-schema');


module.exports = async function(context, next, conversationData){

  var url = "https://monday.com"
  if(conversationData.board != null){

  }


  var reply = MessageFactory.text(`Sure here is the link: \r\n${url}`);
  await context.sendActivity(reply);
}

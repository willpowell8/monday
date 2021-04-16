const { MessageFactory } = require('botbuilder');
const monday = require("../monday.js");
const { ActionTypes } = require('botframework-schema');


module.exports = async function(context, next, conversationData){
  if(conversationData.board == null){
    var items = [
      `We dont seem to have a board`,
      `Maybe I missed it but I dont think you said`,
      `Sorry I don't have a board to work on`
    ]
    var item = items[Math.floor(Math.random() * items.length)];
    await context.sendActivity(MessageFactory.text(item, item));
  }else{
    var boardName = conversationData.board.name
    var items = [
      `We are currently in ${boardName}`,
      `We are working in ${boardName}`,
      `${boardName} is our current target`
    ]
    var item = items[Math.floor(Math.random() * items.length)];
    await context.sendActivity(MessageFactory.text(item, item));
  }
}

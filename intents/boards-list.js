const { MessageFactory } = require('botbuilder');
const monday = require("../monday.js");
const { ActionTypes } = require('botframework-schema');


module.exports = async function(context, next, conversationData){

  var result = await monday.api('query { boards { id name } }');
  var selectedBoard = context.activity.text;
  if(conversationData.intent == "agent.boards.list"){

    var matchBoard = result.data.boards.find(function(board){
      return board.id == selectedBoard || board.name.toLowerCase() == selectedBoard.toLowerCase();
    })
    if(matchBoard == null){
      await context.sendActivity(MessageFactory.text("Could not find matching board", "Could not find matching board"));
    }else{
      conversationData.intent = null;
      conversationData.board = matchBoard;
      await context.sendActivity(MessageFactory.text(`Board selected ${matchBoard.name}`, `Board selected ${matchBoard.name}`));
      return;
    }
  }

  var matchBoard = result.data.boards.find(function(board){
    return selectedBoard.toLowerCase().indexOf(board.name.toLowerCase())> -1;
  })
  if(matchBoard != null){
    conversationData.intent = null;
    conversationData.board = matchBoard;
    await context.sendActivity(MessageFactory.text(`Board selected ${matchBoard.name}`, `Board selected ${matchBoard.name}`));
    return;
  }

  var items = result.data.boards.map((board) => {
    return board.name
  });
  var text = items.join("\n")
  console.log(JSON.stringify(result));
  var boards = result.data.boards;
  var actions = []
  var boardList = "";
  boards.forEach(function(board){
    boardList += `${board.name}\r\n`
    actions.push({
      type: ActionTypes.PostBack,
      title: board.name,
      value: board.id
    })
  })
  var reply = MessageFactory.suggestedActions(actions, `Which board do you want to work with?\r\n${boardList}`);
  await context.sendActivity(reply);
  conversationData.intent = "agent.boards.list";
  //await context.sendActivity(MessageFactory.text(text, text));
}

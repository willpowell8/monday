const { MessageFactory } = require('botbuilder');
const mondaySdk = require("monday-sdk-js");
const { ActionTypes } = require('botframework-schema');

module.exports = async function(context, next, conversationData){

  const monday = mondaySdk();

  monday.setToken('eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjg5NjYwNDgyLCJ1aWQiOjE2NjY1NzIxLCJpYWQiOiIyMDIwLTExLTAxVDEzOjQzOjAyLjAwMFoiLCJwZXIiOiJtZTp3cml0ZSIsImFjdGlkIjo3MzM2MzM3LCJyZ24iOiJ1c2UxIn0.Snko3tzbKJyYoTPMAwK2mo0zzcgCl0xEXAjJEGcPB6Y');
  var result = await monday.api('query { boards { id name } }');
  if(conversationData.intent == "agent.boards.list"){
    var selectedBoard = context.activity.text;
    var matchBoard = result.data.boards.find(function(board){
      return board.id == selectedBoard;
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
  var items = result.data.boards.map((board) => {
    return board.name
  });
  var text = items.join("\n")
  console.log(JSON.stringify(result));
  var boards = result.data.boards;
  var actions = []
  boards.forEach(function(board){
    actions.push({
      type: ActionTypes.PostBack,
      title: board.name,
      value: board.id
    })
  })
  var reply = MessageFactory.suggestedActions(actions, 'Which board do you want to work with?');
  await context.sendActivity(reply);
  conversationData.intent = "agent.boards.list";
  //await context.sendActivity(MessageFactory.text(text, text));
}

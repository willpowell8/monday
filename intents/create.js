const { MessageFactory } = require('botbuilder');
const monday = require("../monday.js");
const {
    AttachmentPrompt,
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    ConfirmPrompt,
    DialogSet,
    DialogTurnStatus,
    NumberPrompt,
    TextPrompt,
    WaterfallDialog
} = require('botbuilder-dialogs');
const { Channels } = require('botbuilder-core');
const { UserProfile } = require('../userProfile');

const ATTACHMENT_PROMPT = 'ATTACHMENT_PROMPT';
const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const USER_PROFILE = 'USER_PROFILE';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';

class CreateItemDialog extends ComponentDialog {
    constructor(userState, result, boardId, board, users, conversationData) {
        super('userProfileDialog');
        this.conversationData = conversationData;
        this.users = users;
        this.board = board;
        this.result = result;
        this.boardId = boardId;
        conversationData.isCreating = true;

        this.userProfile = userState.createProperty(USER_PROFILE);

        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));

        var items = []
        var columns = result.data.boards[0].columns;

        columns.forEach((item, i) => {
          items.push(async function (step) {
              if(i > 0){
                var previousItem = columns[i-1]

                console.log("VALUE", previousItem, previousItem.name, step.result)
                if(step.result != null){
                  if(step.result.value != null){
                    if(previousItem.type == "multiple-person"){
                      console.log("Handling Multiple person")
                      var user;
                      this.users.forEach((item, i) => {
                        if(item.name == step.result.value){
                          user = item;
                        }
                      });
                      step.values[previousItem.id] = `${user.id}`;
                    }else{
                      step.values[previousItem.id] = step.result.value;
                    }

                  }else{
                    if(previousItem.type == "multiple-person"){
                      console.log("Handling Multiple person")
                      var user;
                      this.users.forEach((item, i) => {
                        if(item.name == step.result){
                          user = item;
                        }
                      });
                      step.values[previousItem.id] = `${user.id}`;
                    }else{
                      step.values[previousItem.id] = step.result;
                    }

                  }
                }
              }

              var currentItem = columns[i];
              var type = currentItem.type;
              switch(type){
                case "multiple-person":
                var values = [];
                this.users.forEach((item, i) => {
                  values.push(item.name)
                });

                var prompt = `Who would you like to '${item.title}'`

                return await step.prompt(CHOICE_PROMPT, {
                    prompt: prompt,
                    choices: ChoiceFactory.toChoices(values)
                });
                break;
                case "color":
                console.log(currentItem);
                var jsonStringSettings = currentItem.settings_str;
                var settings = JSON.parse(jsonStringSettings);
                var labels = settings["labels"];
                var values = [];

                Object.keys(settings["labels"]).forEach((item, i) => {
                  var value = labels[item];
                  if(value.length > 0){
                    values.push(value);
                  }
                });
                var prompt = `What would you like to set '${item.title}'?`
                return await step.prompt(CHOICE_PROMPT, {
                    prompt: prompt,
                    choices: ChoiceFactory.toChoices(values)
                });
                break;
                default:
                var prompt2 = `what should I set for '${item.title}'?`
                return await step.prompt(NAME_PROMPT,prompt2);
                break;
              }
              // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
              // Running a prompt here means the next WaterfallStep will be run when the user's response is received.

          }.bind(this))
        });
        items.push(this.summaryStep.bind(this));


        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, items));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async transportStep(step) {
        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        // Running a prompt here means the next WaterfallStep will be run when the user's response is received.
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Please enter your mode of transports.2',
            choices: ChoiceFactory.toChoices(['Car', 'Bus', 'Bicycle'])
        });
    }

    async transportStep3(step) {
        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        // Running a prompt here means the next WaterfallStep will be run when the user's response is received.
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Please enter your mode of transports.3',
            choices: ChoiceFactory.toChoices(['Car2', 'Bus', 'Bicycle'])
        });
    }

    async nameStep(step) {
        step.values.transport = step.result.value;
        return await step.prompt(NAME_PROMPT, 'Please enter your name.');
    }

    async nameConfirmStep(step) {
        step.values.name = step.result;

        // We can send messages to the user at any point in the WaterfallStep.
        await step.context.sendActivity(`Thanks ${ step.result }.`);

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        return await step.prompt(CONFIRM_PROMPT, 'Do you want to give your age?', ['yes', 'no']);
    }

    async ageStep(step) {
        if (step.result) {
            // User said "yes" so we will be prompting for the age.
            // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
            const promptOptions = { prompt: 'Please enter your age.', retryPrompt: 'The value entered must be greater than 0 and less than 150.' };

            return await step.prompt(NUMBER_PROMPT, promptOptions);
        } else {
            // User said "no" so we will skip the next step. Give -1 as the age.
            return await step.next(-1);
        }
    }

    async pictureStep(step) {
        step.values.age = step.result;

        const msg = step.values.age === -1 ? 'No age given.' : `I have your age as ${ step.values.age }.`;

        // We can send messages to the user at any point in the WaterfallStep.
        await step.context.sendActivity(msg);

        if (step.context.activity.channelId === Channels.msteams) {
            // This attachment prompt example is not designed to work for Teams attachments, so skip it in this case
            await step.context.sendActivity('Skipping attachment prompt in Teams channel...');
            return await step.next(undefined);
        } else {
            // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
            var promptOptions = {
                prompt: 'Please attach a profile picture (or type any message to skip).',
                retryPrompt: 'The attachment must be a jpeg/png image file.'
            };

            return await step.prompt(ATTACHMENT_PROMPT, promptOptions);
        }
    }

    async confirmStep(step) {
        step.values.picture = step.result && step.result[0];

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        return await step.prompt(CONFIRM_PROMPT, { prompt: 'Is this okay?' });
    }

    async summaryStep(step) {
        var columns = this.result.data.boards[0].columns;
        var previousItem = columns[columns.length-1]
        if(step.result != null){
          if(step.result.value != null){
            if(previousItem.type == "multiple-person"){
              console.log("Handling Multiple person")
              var user;
              this.users.forEach((item, i) => {
                if(item.name == step.result.value){
                  user = item;
                }
              });
              step.values[previousItem.id] = `${user.id}`;
            }else{
              step.values[previousItem.id] = step.result.value;
            }
          }else{
            step.values[previousItem.id] = step.result;
          }
        }
        this.conversationData.isCreating = null;
        var boardId = this.boardId;
        var itemName = step.values["name"]
        var objects = {};
        columns.forEach((item, i) => {
          if(item.id != "name" && step.values[item.id] != null){
            objects[item.id] = step.values[item.id]
          }
        });
        var stringItem = JSON.stringify(objects);
        stringItem = JSON.stringify(String(stringItem));
        stringItem = stringItem.substring(1, stringItem.length-1);
        console.log("STRING PAYLOAD", stringItem)
        var createMethod = `mutation { create_item (board_id: ${this.boardId}, item_name:"${itemName}" column_values:"${stringItem}") {id}}`;
        var result = await monday.api(createMethod);
        console.log("Got Result", result);
        if(result.data != null && result.data.create_item != null && result.data.create_item.id != null){
          var itemId = result.data.create_item.id
          this.conversationData.itemId = itemId;
          var slug = this.board.owner.account.slug;
          var boardLink = `https://${slug}.monday.com/boards/${this.boardId}/pulses/${itemId}`
          await step.context.sendActivity(`Thanks. I have just created it for you. Quick access it ${boardLink}`);
        }else{
          await step.context.sendActivity(`Opps it appears an error occurred`);
        }

        /*if (step.result) {
          console.log("VALUES",step.values);
            // Get the current profile object from user state.
            const userProfile = await this.userProfile.get(step.context, new UserProfile());

            userProfile.transport = step.values.transport;
            userProfile.name = step.values.name;
            userProfile.age = step.values.age;
            userProfile.picture = step.values.picture;

            let msg = `I have your mode of transport as ${ userProfile.transport } and your name as ${ userProfile.name }`;
            if (userProfile.age !== -1) {
                msg += ` and your age as ${ userProfile.age }`;
            }

            msg += '.';
            await step.context.sendActivity(msg);
            if (userProfile.picture) {
                try {
                    await step.context.sendActivity(MessageFactory.attachment(userProfile.picture, 'This is your profile picture.'));
                } catch {
                    await step.context.sendActivity('A profile picture was saved but could not be displayed here.');
                }
            }
        } else {
            await step.context.sendActivity('Thanks. Your profile will not be kept.');
        }*/

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is the end.
        return await step.endDialog();
    }

    async agePromptValidator(promptContext) {
        // This condition is our validation rule. You can also change the value at this point.
        return promptContext.recognized.succeeded && promptContext.recognized.value > 0 && promptContext.recognized.value < 150;
    }

    async picturePromptValidator(promptContext) {
        if (promptContext.recognized.succeeded) {
            var attachments = promptContext.recognized.value;
            var validImages = [];

            attachments.forEach(attachment => {
                if (attachment.contentType === 'image/jpeg' || attachment.contentType === 'image/png') {
                    validImages.push(attachment);
                }
            });

            promptContext.recognized.value = validImages;

            // If none of the attachments are valid images, the retry prompt should be sent.
            return !!validImages.length;
        } else {
            await promptContext.context.sendActivity('No attachments received. Proceeding without a profile picture...');

            // We can return true from a validator function even if Recognized.Succeeded is false.
            return true;
        }
    }
}

module.exports = async function(context, next, conversationData, conversationState, userState, dialogState){

  var boardMarkers = ["on board", "for board", "to board", "on"]

  var board = conversationData.creatingBoard;
  if(board == null){
    board = conversationData.board;
  }
  var isCreating = conversationData.isCreating != null ? true : false;

  if(!isCreating){
    for(var i = 0; i< boardMarkers.length; i++){
      var marker = boardMarkers[i];
      var selectedBoard = context.activity.text;
      if(selectedBoard.indexOf(marker) > -1){
        var result = await monday.api('query { boards { id name board_kind owner { id name account { slug } } } }');
        var matchBoard = result.data.boards.find(function(board){
          return selectedBoard.toLowerCase().indexOf(board.name.toLowerCase())> -1;
        })
        if(matchBoard == null){
          await context.sendActivity(MessageFactory.text("Could not find that board to work with", "Could not find that board to work with"));
          return;
        }else{
          board = matchBoard;
          conversationData.creatingBoard = board;
        }
      }
    }
  }




  if(board == null){
    await context.sendActivity(MessageFactory.text("You need to tell me what board you want to work on", "You need to tell me what board you want to work on"));
    await require('./boards-list')(context, next, conversationData);
    return;
  }
  var boardId = board.id;
  if(!isCreating){
    var calledMarkers = ["called", "with title", "titled", "named"]
    var activityIntent = context.activity.text;
    for(var i = 0; i< calledMarkers.length; i++){
      var marker = calledMarkers[i];
      if(activityIntent.indexOf(calledMarkers[i])>-1){
        var calledParts = activityIntent.split(marker);
        var lastPart = calledParts[calledParts.length - 1];
        var createMethod = `mutation { create_item (board_id: ${boardId}, item_name:"${lastPart}") {id}}`;
        var result = await monday.api(createMethod);
        console.log("Quick create", result);
        if(result.data != null && result.data.create_item != null && result.data.create_item.id != null){
          var itemId = result.data.create_item.id
          conversationData.itemId = itemId;
          var slug = board.owner.account.slug;
          var boardLink = `https://${slug}.monday.com/boards/${this.boardId}/pulses/${itemId}`
          await context.sendActivity(`Thanks. I have just created it for you.`);
        }else{
          await context.sendActivity(`Opps it appears an error occurred`);
        }
        return;
      }
    }
  }




  var result = await monday.api(`query {  boards (ids: ${boardId}) {owner {id} columns { id, title, type, settings_str} } }`);
  var users = await monday.api(`query{users{id name}}`)
  var createItem = new CreateItemDialog(userState, result, boardId, board, users.data.users, conversationData)
  await createItem.run(context, dialogState)
  conversationData.intent = "agent.create"
  //await context.sendActivity(MessageFactory.text("Reply", "number 2"));
  // By calling next() you ensure that the next BotHandler is run.
}

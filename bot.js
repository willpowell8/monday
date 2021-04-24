// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const mondaySdk = require("monday-sdk-js");
const { ActivityHandler, MessageFactory } = require('botbuilder');
const { dockStart } = require('@nlpjs/basic');

const CONVERSATION_DATA_PROPERTY = 'conversationData';
const USER_PROFILE_PROPERTY = 'userProfile';

class EchoBot extends ActivityHandler {
    constructor(conversationState, userState) {
        super();
        console.log(conversationState, userState)

        this.conversationDataAccessor = conversationState.createProperty(CONVERSATION_DATA_PROPERTY);
        this.userProfileAccessor = userState.createProperty(USER_PROFILE_PROPERTY);

        this.conversationState = conversationState;
        this.userState = userState;
        async function nlpStart () {
          const dock = await dockStart({ use: ['Basic']});
          var nlp = dock.get('nlp');
          await nlp.addCorpus('./corpus.json');
          await nlp.train();
          global.nlp = nlp;
        }


        nlpStart();
        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            const conversationData = await this.conversationDataAccessor.get(context, { promptedForUserName: false });
            const replyText = `OK: ${ context.activity.text }`;
            var intent;
            var response;
            if(conversationData.intent != null){
              intent = conversationData.intent;
            }else{
              response = await global.nlp.process('en', context.activity.text);
              intent = response.intent;
            }
            if(intent.indexOf("response.") > -1 && response != null){
              await context.sendActivity(MessageFactory.text(response.answer, response.answer));
            }else{
              switch(intent){
                case "agent.create":
                  this.dialogState = conversationState.createProperty('CreateDialogState');
                  await require('./intents/create')(context, next, conversationData, conversationState, userState, this.dialogState);
                break;
                case "agent.boards.list":
                  await require('./intents/boards-list')(context, next, conversationData);
                break
                case "agent.boards.current":
                  await require('./intents/board-current')(context, next, conversationData);
                break;
                case "agent.link":
                  await require('./intents/link')(context, next, conversationData);
                break;
                case "agent.assigned.to.me":
                  await require('./intents/graph')(context, next, conversationData);

                break
                case "agent.update.item":

                break;
                case "agent.update":

                break;
                case "agent.add":

                break;
                case "agent.assign.to.me":

                break;
                case "agent.addcomment":

                break;
                case "agent.addthatcomment":

                break;
                default:
                  /*if(conversationData.board != null){
                    await context.sendActivity(MessageFactory.text(conversationData.board.name, conversationData.board.name));
                  }
                  this.dialogState = conversationState.createProperty('DialogState');
                  await global.dialog.run(context, this.dialogState);*/
              }
            }

            console.log("Executing next");
            next();

        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hi, I am your Monday bot and Im here to help!';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }

    async run(context) {
        await super.run(context);

        // Save any state changes. The load happened during the execution of the Dialog.
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }
}

module.exports.EchoBot = EchoBot;

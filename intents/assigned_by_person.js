const { MessageFactory } = require('botbuilder');
const monday = require("../monday.js");
const fs = require("fs");
const path = require("path");
const { ActivityHandler, ActionTypes, ActivityTypes, CardFactory } = require('botbuilder');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

async function getInlineAttachment(statusCount,peopleColumn, statusColumn) {
  const width = 400;
  const height = 200;
  const chartCallback = (ChartJS) => {

      // Global config example: https://www.chartjs.org/docs/latest/configuration/
      ChartJS.defaults.global.elements.rectangle.borderWidth = 2;
      // Global plugin example: https://www.chartjs.org/docs/latest/developers/plugins.html
      ChartJS.plugins.register({
          // plugin implementation
      });
      // New chart type example: https://www.chartjs.org/docs/latest/developers/charts.html
      ChartJS.controllers.MyType = ChartJS.DatasetController.extend({
          // chart implementation
      });
  };
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });



    var data = [];
    var labels = [];
    Object.keys(statusCount).forEach((key, i) => {
      labels.push(key)
      data.push(statusCount[key])
    });


    const configuration = {
          type: 'bar',
          data: {
              labels: labels,
              datasets: [{
                  label: 'assigned items',
                  data: data,
                  backgroundColor: [
                      'rgba(54, 162, 235, 0.2)',
                      'rgba(54, 162, 235, 0.2)',
                      'rgba(54, 162, 235, 0.2)',
                      'rgba(54, 162, 235, 0.2)',
                      'rgba(54, 162, 235, 0.2)',
                      'rgba(54, 162, 235, 0.2)'
                  ],
                  borderColor: [
                      'rgba(54, 162, 235, 1)',
                      'rgba(54, 162, 235, 1)',
                      'rgba(54, 162, 235, 1)',
                      'rgba(54, 162, 235, 1)',
                      'rgba(54, 162, 235, 1)',
                      'rgba(54, 162, 235, 1)'
                  ],
                  borderWidth: 1
              }]
          },
          options: {
              scales: {
                  yAxes: [{
                      ticks: {
                          beginAtZero: true,

                      }
                  }]
              },
              title: {
                display: true,
                text: 'Tickets by team mate'
              },
              legend: {
                display: false
              }
          }
      };
  const image = await chartJSNodeCanvas.renderToBuffer(configuration);
  // const imageData = fs.readFileSync(path.join(__dirname, '../resources/monday.png'));
  // const base64Image = Buffer.from(imageData).toString('base64');
  const base64Image = image.toString('base64');

  return {
      name: 'architecture-resize.png',
      contentType: 'image/png',
      contentUrl: `data:image/png;base64,${ base64Image }`
};
}



module.exports = async function(context, next, conversationData){

  var meQuery = `query {me { id name }}`;
  var me = await monday.api(meQuery);
  var meId = me.data.me.id;
  var meName = me.data.me.name;
  var query = `query {boards(ids: 866476004){id name columns{id type title settings_str} items{ id name column_values{ id text type }}}}`;
  var result = await monday.api(query);
  var items = result.data.boards[0].items;
  if(items.length == 0){
    var erreply = MessageFactory.text(`Seems like there are no items for this board`);
    await context.sendActivity(erreply);
    return
  }

  var columns = result.data.boards[0].columns;
  var peopleColumn;
  columns.forEach((column, i) => {
    if(column.type == "multiple-person"){
      peopleColumn = column;
    }
  });


  if(peopleColumn == null){
    var reply1 = MessageFactory.text(`Could not find the people column`);
    await context.sendActivity(reply1);
    return
  }

  var statusCount = {}
  items.forEach((item, i) => {
    var itemCols = {};
    item.column_values.forEach((v, i) => {
      itemCols[v.id] = v;
    });

    var peopleValue = itemCols[peopleColumn.id];
    var user = peopleValue.text;
    if(user == null || user.length == 0){
      user = "Not Set"
    }
    if(statusCount[user] == null){
      statusCount[user] = 1;
    }else{
      statusCount[user] += 1;
    }
  });

  var messageString = []
  Object.keys(statusCount).forEach((key, i) => {
    var count = statusCount[key]
    messageString.push(`${key} has ${count}`)
  });
  var output = messageString.join(",")


  const reply = { type: ActivityTypes.Message };
  reply.text = `The tickets are distributed as follows: ${output}`;
  var graph = await getInlineAttachment(statusCount,peopleColumn);
  reply.attachments = [graph];
  await context.sendActivity(reply);
}

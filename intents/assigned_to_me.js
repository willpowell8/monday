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


  /*const configuration = {
        type: 'bar',
        data: {
            labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
            datasets: [{
                label: '# of Votes',
                data: [12, 19, 3, 5, 2, 3],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)',
                    'rgba(255, 159, 64, 0.2)'
                ],
                borderColor: [
                    'rgba(255,99,132,1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true,
                        callback: (value) => '$' + value
                    }
                }]
            }
        }
    };*/
    var data = [];
    var labels = [];
    Object.keys(statusCount).forEach((key, i) => {
      labels.push(key)
      data.push(statusCount[key])
    });

    var colors = [];
    var borderColors = [];
    var statusSettings = JSON.parse(statusColumn.settings_str);
    var statusLabels = statusSettings.labels;
    var statusLabelColors = statusSettings.labels_colors
    labels.forEach((label, i) => {
      var id;
      Object.keys(statusLabels).forEach((statusLabelsVal, i) => {
        if(statusLabels[statusLabelsVal] == label){
          id = statusLabelsVal;
        }
      });
      var color = statusLabelColors[id].color;
      var borderColor = statusLabelColors[id].border;
      colors.push(color);
      borderColors.push(borderColor);
    });


  const configuration = {
    type: 'pie',
    data:{
        datasets: [{
            data: data,
            backgroundColor: colors,
            borderColor:borderColors
        }],

        // These labels appear in the legend and in the tooltips when hovering different arcs
        labels: labels
    },
    options: {
        plugins: {
            title: {
                display: true,
                text: 'Custom Chart Title',
                padding: {
                    top: 10,
                    bottom: 30
                }
            }
        }
    }
  }
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
  var statusColumn;
  var peopleColumn;
  columns.forEach((column, i) => {
    if(column.type == "color"){
      statusColumn = column;
    }else if(column.type == "multiple-person"){
      peopleColumn = column;
    }
  });


  if(peopleColumn == null){
    var reply1 = MessageFactory.text(`Could not find the people column`);
    await context.sendActivity(reply1);
    return
  }

  if(statusColumn == null){
    var reply2 = MessageFactory.text(`Could not find the status column`);
    await context.sendActivity(reply2);
    return
  }
  var statusCount = {}
  items.forEach((item, i) => {
    var itemCols = {};
    item.column_values.forEach((v, i) => {
      itemCols[v.id] = v;
    });

    var peopleValue = itemCols[peopleColumn.id];
    var statusValue = itemCols[statusColumn.id];
    if(peopleValue.text == meName){
      if(statusCount[statusValue.text] == null){
        statusCount[statusValue.text] = 1;
      }else{
        statusCount[statusValue.text] += 1;
      }
    }
  });

  var messageString = []
  Object.keys(statusCount).forEach((key, i) => {
    var count = statusCount[key]
    messageString.push(`${count} in ${key}`)
  });
  var output = messageString.join(",")


  const reply = { type: ActivityTypes.Message };
  reply.text = `You have tickets ${output}`;
  var graph = await getInlineAttachment(statusCount,peopleColumn, statusColumn);
  reply.attachments = [graph];
  await context.sendActivity(reply);
}

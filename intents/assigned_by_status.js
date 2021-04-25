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
    var datasets = [];
    var labels = [];

    var statusSettings = JSON.parse(statusColumn.settings_str);
    var statusLabels = statusSettings.labels;
    var statusLabelColors = statusSettings.labels_colors
    Object.keys(statusLabels).forEach((statusLabel, i) => {
      var l = statusLabels[statusLabel]
      var id;
      Object.keys(statusLabels).forEach((statusLabelsVal, i) => {
        if(statusLabels[statusLabelsVal] == l){
          id = statusLabelsVal;
        }
      });
      var color = statusLabelColors[id].color;
      var borderColor = statusLabelColors[id].border;
      var colors = []
      var borderColors = []
      for(var i = 0; i<10; i++){
        colors.push(color);
        borderColors.push(borderColor)
      }
      borderColors.push(borderColor);
      datasets.push({
          label: l,
          data: [],
          backgroundColor: colors,
          borderColor: borderColors,
          borderWidth: 1
      })
    })

    Object.keys(statusCount).forEach((key, i) => {
      labels.push(key)
      var statusElement = statusCount[key];
      Object.keys(statusLabels).forEach((statusLabel, i) => {

        var statusLabelValue = statusLabels[statusLabel]
        var value = 0;
        if(statusCount[key][statusLabelValue] != null){
          value = statusCount[key][statusLabelValue];
        }
        datasets[i].data.push(value)
      })
    });

    var d = [];
    datasets.forEach((item, i) => {
      if(item.label.length > 0){
        d.push(item);
      }
    });



    const configuration = {
          type: 'bar',
          data: {
              labels: labels,
              datasets: d
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
                text: 'Tickets by status for each team mate'
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
    var user =  peopleValue.text;
    if(user == null || user.length == 0){
      user = "Not Set"
    }
    var statusValue = itemCols[statusColumn.id];
    if(statusCount[user] == null){
      statusCount[user] = {}
    }
    if(statusCount[user][statusValue.text] == null){
      statusCount[user][statusValue.text] = 1;
    }else{
      statusCount[user][statusValue.text] += 1;
    }
  });



  const reply = { type: ActivityTypes.Message };
  reply.text = `Here is the breakdown`;
  var graph = await getInlineAttachment(statusCount,peopleColumn, statusColumn);
  reply.attachments = [graph];
  await context.sendActivity(reply);
}

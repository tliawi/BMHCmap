//convert.js

//in terminal, in the folder containing this file and MennoAndBrethrenCongs.csv, do
//node convert.js

//To make MennoAndBrethrenCongs.csv from "Menno and brethren congs.xlsx" I eliminated
//the column with gps coordinates separated by a comma, and removed formatting from the two
//columns having separated gps coordinates, so that full numeric value was visible.
//Save-as csv, tab separated (there were commas elsewhere too).

var datArray = [];
function processLine(line){
	var larray = line.split("\t");
	var dat = {};
	
	var j=0;
	larray.forEach(item=> {
		dat[rubrics[j]] = item;
		j++;
	});
	
	datArray.push(dat);
}

function postRead(){
    console.log('postRead '+lCount);
    console.log(datArray[5].cong)
}

const readline = require('readline');
const fs = require('fs');
var rubrics;

const readInterface = readline.createInterface({
    input: fs.createReadStream('./MennoAndBrethrenCongs.csv'),
    //output: process.stdout,
    //console: false
});

console.log("hello froggin world");

readInterface.on('close', postRead); //executes after all lines have been read

var lCount = 0;
readInterface.on('line', function(line) {
	lCount++;
	if (lCount == 1) rubrics = line.split("\t");
	else processLine(line);
});

///any code here executes immediately, before file is finished reading
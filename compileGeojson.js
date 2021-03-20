//compileGeojson.js

//node compileGeojson.js
//includes bmhc.js, bmhcTags.js, and data from bmhcData.js
//writes map.geojson
//for subsequent use by mapDisplay.html


function FeatureCollection(featureArray){
    this.type="FeatureCollection",
    this.features = featureArray;
}

function Feature(properties,point){
    this.type = "Feature";
    this.properties = properties;
    this.geometry = point;
}

function Properties( name, beginDate, endDate, denomination, weightRoot, tags, photo){
    this.name=name;
    this.begin=beginDate;
    this.end=endDate;
    this.denomination=denomination;
    this.weightRoot=weightRoot;
    this.tags=tags;
    this.photo=photo;
}

function Point( coords ){
    this.type = "Point";
    let couple = coords.split(',');
    this.coordinates = [parseInt(couple[1]), parseInt(couple[0])]; //reverse order
}


function State(name,yr){
    yr = yr+''; //convert to string
    this.begin=yr;
    this.end = ''; //must be modified later
    this.denomination=bmhc.getDenomination(name); 
    this.weightRoot = String.toString( Math.sqrt( bmhc.getMostRecentWeight( name, yr)));
    this.tags = '|'+bmhc.getMostRecentAffiliationsString(name,yr)+'|'+bmhc.getTagsString(name,yr)+'|';
    this.photo = bmhc.getMostRecentPhotoString(name,yr);
    this.coord = bmhc.getMostRecentCoordinatesString(name,yr);
}

//only include what is necessary to distinguish two of the same name, disregarding date
State.prototype.compareString = function() {
    return this.coords+this.weightRoot+' '+this.tags+' '+this.photo;
}

//begin execution

const fs = require('fs');

eval(fs.readFileSync('./bmhc.js')+''); //include 
var bmhc=BMHCobj();

eval(fs.readFileSync('./bmhcTags.js')+''); //include 
bmhc.setTags(bmhcTags());

eval(fs.readFileSync('./bmhcData.js')+''); //include 
bmhc.setData(bmhcData());

var features=[];
//very long process that adds to features
bmhc.getAllAssemblyNames().forEach(name=>{
    
    let span = bmhc.assemblyLifeTime(name);
    let startYr = parseInt(span[0]); //get year
    let endYr = parseInt(span[1]);
    
    let priorCompareString = '';
    let priorYear = 0; 
    
    for (let yr = startYr; yr<=endYr; yr++){
        let state = new State(name,yr);
        let compareString = state.compareString();
        if (compareString!=priorCompareString) {
            birthNewFeature(name,state,yr); //also fixes prior one
            priorYear = yr;
            priorCompareString = compareString;
        }
    }
});


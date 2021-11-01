//compileGeojson.js

//node compileGeojson.js
//includes bmhc.js, bmhcTags.js, and bmhcData.js
//writes map.geojson and mapAffiliations.js for subsequent use 
//by mapDisplay.html


function FeatureCollection(featureArray){
    this.type="FeatureCollection";
    this.features = featureArray;
}

function Feature(properties,point){
    this.type = "Feature";
    this.properties = properties;
    this.geometry = point;
}

function Properties( name, begin, end, denomination, weight, affiliations, tags, photo){
    this.name=name;
    this.begin=begin;
    this.end=end;
    this.denomination=denomination;
    this.weight=weight;
    this.affiliations = affiliations;
    this.tags=tags;
    this.photo=photo;
}

function Point( coords ){
    this.type = "Point";
    let couple = coords.split(',');
    this.coordinates = [parseFloat(couple[1]), parseFloat(couple[0])]; //reverse order
}

function birthNewFeature(name,year,state){
    let point = new Point(state.coordinates);
    let properties = new Properties(
        name, 
        year+'', 
        compilationYear()+'', //may be changed by subsequent birth
        bmhc.getDenomination(name),
        Math.sqrt(state.membership), //convert membership to weight, map circle size performance enhancement only
        state.affiliations,
        state.tags,
        state.photo
    )
    
    return new Feature(properties,point);
}

//returns an integer, not a string
function compilationYear(){ return (new Date()).getFullYear(); };

//begin execution

const fs = require('fs');

eval(fs.readFileSync('./bmhc.js')+''); //include 
var bmhc=BMHCobj();

eval(fs.readFileSync('./bmhcTags.js')+''); //include 
bmhc.setTags(bmhcTags());

eval(fs.readFileSync('./bmhcData.js')+''); //include 
bmhc.setData(bmhcData());

var features=[];
var allAffiliations=[];

//very long process that grows features array, and all affiliations
bmhc.getAllAssemblyNames().forEach(name=>{
    
    let span = bmhc.assemblyLifeTime(name);
    if (span) {
        let startYr = parseInt(span.begin); //get year
        let endYr = parseInt(span.end);
        if (endYr > compilationYear()) endYr = compilationYear(); 

        let priorCompString = '';
        let priorFeature = null;
        let state = null;
        for (let yr = startYr; yr<=endYr; yr++){
            state = bmhc.getState(name,yr+'/12/31'); //to string
            if (state.coordinates){ //coordinates null or '' implies can't be expressed on map
                let compString = state.comparisonString();
                if (compString!=priorCompString) {
                    //fix end year of priorFeature
                    if (priorFeature) priorFeature.properties.end = (yr-1)+'';
                    priorFeature = birthNewFeature(name,yr,state);
                    features.push(priorFeature);
                    priorCompString = compString;

                    //build list of all known affiliations, to save in mapAsssemblies.js
                    state.affiliations.forEach(affiliation => {
                        if ( !(bmhc.getState(affiliation,yr+'/12/31').coordinates) && //don't include those with coordinates
                             !(allAffiliations.includes(affiliation))) allAffiliations.push(affiliation); //avoid duplicates
                        //note that if an assembly is ever targeted while it has no coordinates, it will be put on the list
                    });
                }
            }
        }
        
        //fix end date of last one if it was an "expire-into"
        if (priorFeature && endYr<compilationYear()) priorFeature.properties.end = endYr+'';

    } else console.log("Assembly '"+name+"' has no events.");
    
});

//sort them by weight so larger congregation's names are given display precedence
features.sort((a,b)=>{return (a.properties.weight - b.properties.weight);});

function jsonFeatureCollection(){
    return JSON.stringify(new FeatureCollection(features),null,'\t');
}

fs.writeFile('./map.geojson', jsonFeatureCollection(), function (err) {
    if (err) console.log(err);
    else console.log('map.geojson written.');
});

function wrapMapAffiliationsInJS(contentString){
    return "function mapAffiliations(){ return "+contentString+"; }" ;
}

fs.writeFile('./mapAffiliations.js', wrapMapAffiliationsInJS(JSON.stringify(allAffiliations,null,'\t')), function (err) {
        if (err) console.log(err);
        else console.log('mapAffiliations.js written.');
    });


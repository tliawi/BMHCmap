//convertCSVtoData.js

//in terminal, in the folder containing this file and MennoAndBrethrenCongs.csv, do
//node convert.js

//To make MennoAndBrethrenCongs.csv from "Menno and brethren congs.xlsx" I eliminated
//the column with gps coordinates separated by a comma, and removed formatting from the two
//columns having separated gps coordinates, so that full numeric value was visible.
//I blanked name 'New Hope' in line 118 with rest of row pretty blank.
//I manually changed the following in the csv, all to separate Brethren churches having the same name:
//  Bethel, Broadway menno I changed to plain Bethel, since all other Bethel's were COB and needed stuff added for disambiguation
//  Bethel-Keezeltown := Bethel (Keezeltown)
//  Bethel, Broadway := Bethel (Broadway)
//  Bethel in Nelson county := Bethel (Nelson)
//  Dayton DB
//  New Hope (VA) and (WV)
//  Pleasant View (VA) and (WV)
//  Mount Bethel (Rockingham) and (Botetourt)
//  Pleasant Hill (Augusta) and (Floyd)
//  Pleasant Valley (Augusta) and (Floyd)
//  Bethlehem (Franklin) and (Harrisonburg)
//  Oak Hill (Franklin) and (Fayette Co.) (there already was an Oak Hill (Powells Fort))
//  Mathias (COB) and Mathias (BC), both in Hardy Co.
//  line 259 Windhaven had organizationdate of "1955, 2003", I changed it to 1955
//  Dayton DB memberorganize was "a few", I set to blank
//  Red Hill memberorganize had "c. 90", I set to 90

//Save-as csv, tab separated (there were commas elsewhere too).

var datArray = [];
function processLine(line){
	var larray = line.split("\t");  //tab separated
	var dat = {};
	
	var j=0;
	larray.forEach(item=> {
		dat[rubrics[j]] = item.trim();
		j++;
	});
	
	if (dat.cong.length >0) datArray.push(dat); //accounts for difference in datArray.length and lCount lines read
}

function makeAssemblies(){
     datArray.forEach(dat => {
        let mb = (dat.group=='Menno'?2:(dat.group=='Breth'?1:0));
        let name = dat.cong;
        if (mb==0) console.log('unaffiliated '+name);
        let result = bmhc.addAssembly(name,mb);
        if (result != 'ok') console.log (name+' '+result);
    });
    
    console.log('Assemblies '+datArray.length+" of "+lCount+' rows');
}

function beginHistory(){
    datArray.forEach(dat => {
        
        var events = [];
        if (dat.founded.length) events.push([dat.founded,'founded']);
        if (dat.building1st.length) events.push([dat.building1st,'first building']);
        if (dat.organizationdate.length) events.push([dat.organizationdate,'organization']);
        
        //console.log(events);
        //only add year1n as candidate for begin-history if it is earlier than any of the others,
        //because it will also become a set-membership event
        if (dat.year1n.length) {
            let earliest = '9999';
            events.forEach(pair => {if (pair[0]<earliest) earliest = pair[0];});
            //console.log(dat.year1n +'  '+earliest);
            if (dat.year1n < earliest) events.push([dat.year1n,'first membership data']);
        }
        
        //find the first one, do it as begin-history
        if (events.length){
            let firstDate=events[0][0];
            let firsti = 0;
            
            for (let i=1;i<events.length;i++) if (events[i][0]<firstDate){
                firstDate = events[i][0];
                firsti = i;
            }
            
            //add event firsti as begin-history, with reason in comment
            //assemblyName, eventIndex, date, verb, object, comment
            let result = bmhc.setEvent(dat.cong,null,events[firsti][0],'begin-history','',events[firsti][1]);
            if (result!='ok')console.log('Failed begin-history '+events[firsti][0]+' '+events[firsti][1]+' '+result);
            
            events.splice(firsti,1); //remove the ith element, and add the others as comments
            events.forEach(pair =>{
                result = bmhc.setEvent(dat.cong,null,pair[0],'just-comment','',pair[1]);
                if (result!='ok')console.log('Failed just-comment '+pair[0]+' '+pair[1]+' '+result);
            });
        }
    });
}

function membership(){
    let count=0;
    
    datArray.forEach(dat => {
        let events = [];
        let result;
        
        
        if (dat.memborganize.length && dat.organizationdate.length) {
            result = bmhc.setEvent(dat.cong,null,dat.organizationdate,'set-membership',dat.memborganize,'membership at organization');
            if (result != 'ok')console.log('set-membership of '+dat.cong+' '+dat.organizationdate+' '+dat.memberorganize+':'+result);
            else count++;
        }
        for (let i=1;i<=8;i++){
            let date = dat['year'+i+'n'];
            let memb = dat['memb'+i];
            if (date.length && memb.length){
                result = bmhc.setEvent(dat.cong,null,date,'set-membership',memb,'year'+i+'n');
                if (result != 'ok')console.log('set-membership '+dat.cong+' '+date+' '+memb+' year'+i+'n'+':'+result);
                else count++;
            }
        }
        
    });
    console.log(count+' membership events created.');
}

function setLocales(){
    let count=0;
    var result;
    
    datArray.forEach(dat => {
        let lt = bmhc.assemblyLifeTime(dat.cong);
        if (lt && dat.gps1.length && dat.gps2.length){
            result = bmhc.setEvent(dat.cong,null,lt.begin,'set-locale',dat.gps1+','+dat.gps2,'');
            if (result != 'ok')console.log('set-locale '+dat.cong+' '+lt.begin+' '+dat.gps1+','+dat.gps2+': '+result);
            else count++;
        }
    });
    console.log(count+' locales established.');
}

function postRead(){
    
    //lCount, datArray now fully constituted
    
    makeAssemblies();
    
    beginHistory();
    
    membership();
    
    setLocales();
    
    fs.writeFile('./bmhcDataX.js', bmhc.wrapDataInJS(), function (err) {
        if (err) console.log(err);
        else console.log('bmhcDataX.js written.');
    });

}


const readline = require('readline');
const fs = require('fs');


eval(fs.readFileSync('./bmhc.js')+''); //include 
var bmhc=BMHCobj();

var rubrics;

const readInterface = readline.createInterface({
    input: fs.createReadStream('./MennoAndBrethrenCongs.csv'),
    //output: process.stdout,
    //console: false
});

console.log("hello world");

readInterface.on('close', postRead); //executes after all lines have been read

var lCount = 0;
readInterface.on('line', function(line) {
	lCount++;
	if (lCount == 1) rubrics = line.split("\t");
	else processLine(line);
});

///any code here executes immediately, before file is finished reading
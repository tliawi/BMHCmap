/* 
BMHC.js

Copyright 2021 John R C Fairfield, see MIT License
*/

function BMHCobj(){
    
    const brethren  = 1;
    const mennonite = 2;
    // 0 neither, 3 both
    // name:val pairs, in names no double quotes, no ampersand. Blanks, Apostrophe are OK
    
    // unfinished 
    // means to add labels (never remove them)
    // save db to storage somewhere
    // which will manage concurrent access to getNextId
    // and make addAssembly, changeAssembly, addEvent etc atomic to external db.
    // Implies all db writes will become asynch
    var db = {
        idSource:123, //source of unique assembly ids.
        verbs:{"set-locale":true, "set-weight":true, "set-affiliation":true, "photo":true, "set-label":true, "see-note":true,}, //see checkObject()
        labels:{"paid minister":true,"flag in sanctuary":true,},
        assemblies:{}, //a dictionary of assemblyData, the keys being assembly names
    }
    
    var idToName = {}; //a dictionary of numeric id:string assemblyName pairs, 
    // not necessarily sorted if we merge concurrent access files...
    
    //the reason for ids, and idToName, is so one can change the name of an assembly
    //and all the stored object and note ids do NOT have to change.
    function getNextId(){
        return db.idSource++;
    }
            
    function assemblyData(mb){
        this.id = getNextId();
        this.mb = mb;
        this.events = []; //an array of events comprising the history of an assembly
        this.states = []; //an array of states parallel to events. Display accellerator.
    }
    
    
    function sortObjByKeys(obj) {
      return Object.keys(obj).sort(new Intl.Collator('en').compare).reduce(function (result, key) {
        result[key] = obj[key];
        return result;
      }, {});
    }
    
    function buildIdToName(){
        Object.entries(db.assemblies).forEach(([name, assemblyData]) => idToName[assemblyData.id] = name);
    }
    

    function init(){
        const mockupAssemblies = {
            "2nd District of Virginia":{id:10, mb:1,events:[],states:[]},
            "Brethren Woods Camp and Retreat Center":{id:2, mb:1,events:[],states:[]},
            "Bridgewater":{id:4, mb:1,events:[],states:[]},
            "Church of the Brethren":{id:3, mb:1,events:[],states:[]},
            "Cooks Creek":{id:8, mb:1,events:[],states:[]},
            "Dayton":{id:7, mb:1,events:[],states:[]},
            "Garber's":{id:6, mb:1,events:[],states:[]},
            "German Baptist Brethren":{id:1, mb:1,events:[],states:[]},
            "Harrisonburg First":{id:20, mb:1,events:[],states:[]},
            "Meeting at Solomon Garber home":{id:18, mb:1,events:[],states:[]},
            "Park View":{id:19, mb:2,events:[],states:[]},
            "Community (Harrisonburg)":{id:17, mb:2,events:[],states:[]},
            "Dayton Mennonite":{id:16, mb:2,events:[],states:[]},
            "Pike":{id:15, mb:2,events:[],states:[]}, 
            "Bank":{id:14, mb:2,events:[],states:[]},
            "Weaver's":{id:12, mb:2,events:[],states:[]},
            "Harrisonburg":{id:13, mb:2,events:[],states:[]},
            "Pleasant View":{id:25, mb:2,events:[],states:[]},
            "Virginia Conference":{id:27, mb:2,events:[],states:[]},
            "MCUSA":{id:5, mb:2,events:[],states:[]},
            "Shalom (Anne Arbor)":{id:21, mb:3,events:[],states:[]},
            "the National Cathedral":{id:22, mb:0,events:[],states:[]},
        };
        
        //philosopy: maintain assemblies in sorted key order, is read more often than written.
        db.assemblies = sortObjByKeys(mockupAssemblies);
        buildIdToName();
        
        addMockupEvents();

    }
    
    function addMockupEvents(){
        results = [];
        results.push(addEvent("Bridgewater","1878","set-locale","38.3771809888396,-79.03095281203701",""));
        results.push(addEvent("Bridgewater","1878","set-affiliation","Cooks Creek",""));
       
        results.push(addEvent("Bridgewater","1907/11","set-weight","201","")); results.push(addEvent("Bridgewater","1878/06/22","photo","https://photos.app.goo.gl/XCJtqEQEyVsfogGEA",""));
        results.push(addEvent("Bridgewater","1907","set-affiliation","2nd District of Virginia","[Bridgewater] becomes independent from [Cooks Creek]"));
        results.push(addEvent("Bridgewater","1915","set-label","paid minister",""));
        return results;
    }
        
    function getAllAssemblies(){
        return Object.keys(db.assemblies);
    }
    
    function getMennoniteAssemblies(){
        return getAllAssemblies().filter(name => db.assemblies[name].mb & mennonite);
    }
    
    function getBrethrenAssemblies(){
        return getAllAssemblies().filter(name => db.assemblies[name].mb & brethren);
    }
    
    function getJointAssemblies(){
        return getAllAssemblies().filter(name => db.assemblies[name].mb == 3);
    }
    
    function getNeitherAssemblies(){
        return getAllAssemblies().filter(name => db.assemblies[name].mb == 0);
    }
    
    function getDenomination(name){
        if (assemblyExists(name)) return db.assemblies[name].mb;
    }
    
    function assemblyExists(name){
        return (name in db.assemblies);
    }
    
    function legitAssemblyParms(name, mb){
        // check for null, undefined, "", unfortunately 0, false.
        if (!Boolean(name)) return "blank names not allowed.";
        //does the return if mb is "whatever", whereas (mb<0 || mb > 3) would not
        if (!(mb >= 0 && mb <= 3)) return "this denomination not accepted.";
        if (name.trim().length == 0) return "blank names not allowed.";
        if (name.match(/\[/) || name.match(/\]/)) return "square brackets [ and ] not allowed in assembly names";
        return "ok";
    }
    
    
    function addAssembly(name,mb){ //mb bx00:neither bx10:Mennonnite bx01:Brethren bx11:both
        if (legitAssemblyParms(name,mb)!="ok") return legitAssemblyParms(name,mb); //defends against null, undefined etc.
        name = name.trim();
        if (assemblyExists(name))return "an assembly of this name already exists";
        
        var newAssy = new assemblyData(mb);
        db.assemblies[name] = newAssy;
        db.assemblies = sortObjByKeys(db.assemblies);
        idToName[newAssy.id] = name; //maintain idToName
        return "ok";
    }
    
    function changeAssembly(oldName, newName, mb){
        var data;
        if (legitAssemblyParms(newName,mb)!="ok") return legitAssemblyParms(newName,mb); //defends against null
        newName= newName.trim();
        if (!assemblyExists(oldName)) return "Target assembly doesn't exist.";
        if (newName != oldName && assemblyExists(newName)) return "an assembly of this name already exists."
        
        data = db.assemblies[oldName];
        delete db.assemblies[oldName];
        data.mb = mb; //keep id, events, and states
        db.assemblies[newName] = data; //rename it keeping same id
        db.assemblies = sortObjByKeys(db.assemblies);
        idToName[data.id] = newName; //maintain idToName
        return "ok";
    }
    
    function deleteAssembly(name){
        //tosses assembly and its assemblyData, including all events therein.
        const id = db.assemblies[name].id;
        delete db.assemblies[name]; //doesn't throw anything if it doesn't exist.
        delete idToName[id]; //maintain idToName
        
        //.........still have to go through and delete all events having this name 
        //as object or note reference?? Or just 
        //leave them as historical anomalies? Or never delete, always just mark as deleted? Is a mess that
        //may never occur... how about 
        //function scanEventsForReferences that returns number of references,
        //return "ok" or a toString of all of the events referring to this thing. Alert them.
    }
    
    //------ refs, whether idRefs [id], or namerefs [name]
    
    function stripOffBrackets(ref){ return ref.substr(1,ref.length-2); }
    
    function addBrackets(str) { return "[" + str + "]"; }
    
    function nameRefToIdRef(nameRef){
        return addBrackets(db.assemblies[stripOffBrackets(nameRef)].id);
    }
    
    function idRefToNameRef(idRef){
        return addBrackets(idToName[stripOffBrackets(idRef)]);
    }
    
    //returns "ok" if it succeeds, else an error statement
    function addEvent(subjectAssembly,date,verb,object,note){ //all these are strings as given by user
        
        function event(MIdate,verb,object,note){
            this.date = date;
            this.verb = verb;
            this.object = object;
            this.note = note;
        }
        
        function placeValidatedEvent(subjectAssembly,date,verb,object,note){
            function compareDates(e1,e2){return (e1.date < e2.date)?-1:((e1.date > e2.date)?1:0);}
            var evs = db.assemblies[subjectAssembly].events;
            evs.push(new event(date,verb,object,note));
            evs.sort(compareDates);
        }
        
        subjectAssembly = subjectAssembly.trim();
        date = date.trim();
        verb = verb.trim();
        object = object.trim();
        note = note.trim();
        if (!assemblyExists(subjectAssembly)) return "subject assembly doesn't exist";
        else if (checkDate(date)!="ok") return checkDate(date);
        else {
            if (critiqueVerbObject(verb,object) != "ok") return critiqueVerbObject(verb,object);
            if (verb == "set-affiliation") object = db.assemblies[object].id; // !!!
            try{ note = nameRefsToIdRefs(note); } catch (e) {return e };
            placeValidatedEvent(subjectAssembly,date,verb,object,note);
            return "ok";
        }
    }

    
    function critiqueVerbObject(verb, object){
        if (verb in db.verbs){
            switch (verb){
                case "set-locale":
                    if (object.length > 0) return "ok"; //------unfinished checkGPS(object as gpscoord)
                    else return "bad GPS coordinates";
                case "set-weight":
                    if (object.length && allDigits(object,0,object.length)) return "ok";
                    else return "bad weight amount";
                case "set-affiliation":
                    if (assemblyExists(object)) return "ok";
                    else return "unrecognized affiliation assembly name";
                case "photo": 
                    if (object.length > 0) return "ok"; //---------------unfinished checkURL??? 
                    else return "bad URL";
                case "set-label":
                    if (db.labels[object]) return "ok";
                    else return "unrecognized label";
                case "see-note":
                    if (object.length > 0) return "Object should be blank. Put info in note.";
                    return "ok";
                default: "verb not recognized";
            }
        } else return "unrecognized verb";
    }
    
    function allDigits(candidate,start,len){
        var snippet = candidate.substr(start,len);
        if ( snippet.length != len) return false;
        return /^\d+$/.test(snippet);
    }
    
    //A date 
    //is "yyyy      "
    //or "yyyy/mm   "
    //or "yyyy/mm/dd"
    //boolean
    function checkDate(candidate){
        
        function remainderBlank(i){ return candidate.substr(i).trim().length == 0;}
        
        candidate = candidate.trim();
        if (candidate.length == 0) return "date is blank";
        
        if (!allDigits(candidate,0,4)) return "date year is weird. Needs four digits."
        if (candidate.substr(0,4) < "1000" || candidate.substr(0,4) > "3000") return "date year out of range"; 
        if (remainderBlank(4)) return "ok"; // yyyy
        if (candidate.charAt(4) != '/') return "date must have slash between year and month. Think yyyy/mm/dd";
        if (!allDigits(candidate,5,2)) return "date month is wierd";
        if (candidate.substr(5,2)<"01" || candidate.substr(5,2) > "12") return "date format requires two-digit months, like April 1888 is 1888/04"; //months
        if (remainderBlank(7)) return "ok"; // yyyy/mm
        if (candidate.charAt(7) != '/') return "date must have a slash between month and day. Think yyyy/mm/dd ";
        if (!allDigits(candidate,8,2)) return "date requires two-digit days, like 6th Dec 1888 is 1888/12/06";
        if (candidate.substr(8,2)<"01" || candidate.substr(8,2) > "31") return "date day out of range"; //short months sneak through
        return "ok"; //yyyy/mm/dd
    }

    //returns modified str
    //replacing each [id] reference with [name] reference
    function idRefsToNameRefs(str){ 
        var refs;
        refs = str.match(/\[\d+\]/g) ; //returns an array of refs "[d+]" from the strings
        if (!refs) return str;
        refs = refs.map(ref=>stripOffBrackets(ref));
        refs.forEach(ref => { if (!idToName[ref]) throw ref+" is an unknown assembly reference.";}) ;
        refs.forEach(ref=> { str = str.replace(ref,idToName[ref]);});
        return str;
    }
    
    //returns modified str
    //replacing each [name] reference with [id] reference
    function nameRefsToIdRefs(str){ //replace each [name] reference with [id] reference
        var refs = str.match(/\[.+?\]/g) ; //returns an array of refs "[xxx]" from the strings
        console.log(refs);
        if (!refs) return str;
        refs = refs.map(ref=>stripOffBrackets(ref).trim());
        console.log(refs);
        refs.forEach(ref => { if (!db.assemblies[ref]) throw ref + " is not a known assembly."; });
        console.log(refs);
        refs.forEach(ref=> { str = str.replace(ref,db.assemblies[ref].id);});
        return str;
    }
                         
    //returns an array of eventToStrings corresponding to the events of an assembly
    function getEventStrings(assembly){ 
        
        //flesh out date with trailing &nbsp;s to be (at least) len chars long.
        function buff(date,len){ 
            if (len <= date.length) return date;
            else return date + "&nbsp;".repeat(len-date.length);
        }
        
        function eventToString(ev){
            return buff(ev.date,10) + " " + ev.verb + " " + ((ev.verb == "set-affiliation")?idToName[ev.object]:ev.object) + " " + ((ev.note.length)?"note:"+idRefsToNameRefs(ev.note):""); //unfinished, could throw if assembly deleted.
        }
        
        if (assemblyExists(assembly)) {
            const evs = db.assemblies[assembly].events;
            return db.assemblies[assembly].events.map(ev => eventToString(ev));
        }
        else return [];
    }
    
    init();
    
    return {getAllAssemblies:getAllAssemblies,
            getMennoniteAssemblies:getMennoniteAssemblies,
            getBrethrenAssemblies:getBrethrenAssemblies,
            getNeitherAssemblies:getNeitherAssemblies,
            getJointAssemblies:getJointAssemblies,
            getDenomination:getDenomination,
            assemblyExists:assemblyExists,
            addAssembly:addAssembly,
            changeAssembly:changeAssembly,
            deleteAssembly:deleteAssembly,
            addEvent:addEvent,
            getEventStrings:getEventStrings,
            checkDate:checkDate,
            
            idToName:idToName,
            addMockupEvents:addMockupEvents,
            idRefsToNameRefs:idRefsToNameRefs,
            nameRefsToIdRefs:nameRefsToIdRefs,
            db:db,
           };
}
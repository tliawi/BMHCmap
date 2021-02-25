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
    // means to add tags (never remove them)
    // save db to storage somewhere
    // which will manage concurrent access to getNextId
    // and make addAssembly, changeAssembly, addEvent etc atomic to external db.
    // Implies all db writes will become asynch
    function bmhcDatabase(){
        this.idSource = 13; //source of unique ids for both assemblies and events
        this.verbs = ["set-locale", "set-weight", "set-affiliation", "photo", "set-tag", "see-note"]; //maintain parallel to critiqueVerbObject()
        this.tags = ["paid minister","flag in sanctuary"];
        this.assemblies = {}; //a dictionary of assemblyData, the keys being assembly names
    }
    
    const db = new bmhcDatabase();
    
    let idToName = {}; //a dictionary of numeric id:string assemblyName pairs, 
    // not necessarily sorted if we merge concurrent access files...
    
    //the reason for ids, and idToName, is so one can change the name of an assembly
    //and all the stored object and note ids do NOT have to change.
    //this can generate on the order of 2^52 ids, so not to worry.
    function getNextId(){
        return db.idSource++;
    }
    
    function getVerbs(){
        return [...db.verbs];
    }
    
    function getTags(){
        return [...db.tags];
    }
            
    function assemblyData(mb){
        this.id = getNextId();
        this.mb = mb;
        this.events = []; //an array of events comprising the history of an assembly
    }
    
    
    function sortObjByKeys(obj) {
      return Object.keys(obj).sort(new Intl.Collator('en').compare).reduce(function (result, key) {
        result[key] = obj[key];
        return result;
      }, {});
    }
    
    function buildIdToName(){
        idToName={};
        Object.entries(db.assemblies).forEach(([name, assemblyData]) => idToName[assemblyData.id] = name);
    }
    
    //only works with a valid date!!
    function yearLater(date){
        let yr = parseInt(date);
        return (yr+1).toString() + date.substr(4);
    }
/*
    function init(){
        const mockupAssemblies = {
            "2nd District of Virginia":{id:10, mb:1,events:[]},
            "Brethren Woods Camp and Retreat Center":{id:2, mb:1,events:[]},
            "Bridgewater":{id:4, mb:1,events:[]},
            "Church of the Brethren":{id:3, mb:1,events:[]},
            "Cooks Creek":{id:8, mb:1,events:[]},
            "Dayton":{id:7, mb:1,events:[]},
            "Garber's":{id:6, mb:1,events:[]},
            "German Baptist Brethren":{id:1, mb:1,events:[]},
            "Harrisonburg First":{id:20, mb:1,events:[]},
            "Meeting at Solomon Garber home":{id:18, mb:1,events:[]},
            "Park View":{id:19, mb:2,events:[]},
            "Community (Harrisonburg)":{id:17, mb:2,events:[]},
            "Dayton Mennonite":{id:16, mb:1,events:[]},
            "Pike":{id:15, mb:2,events:[]}, 
            "Bank":{id:14, mb:2,events:[]},
            "Weaver's":{id:12, mb:2,events:[]},
            "Harrisonburg":{id:13, mb:2,events:[]},
            "Pleasant View":{id:25, mb:2,events:[]},
            "Virginia Conference":{id:27, mb:2,events:[]},
            "MCUSA":{id:5, mb:2,events:[]},
            "Shalom (Anne Arbor)":{id:21, mb:3,events:[]},
            "the National Cathedral":{id:22, mb:0,events:[]},
            "Beaver Creek":{id:30, mb:1,events:[]},
            "Montezuma":{id:31, mb:1,events:[]},
            "Summit":{id:32, mb:1,events:[]},
            "Stanton":{id:33, mb:1,events:[]},
            "Mount Bethel":{id:34, mb:1,events:[]}
        };
        
        //philosopy: maintain assemblies in sorted key order, is read more often than written.
        db.assemblies = sortObjByKeys(mockupAssemblies);
        buildIdToName();
        addMockupEvents();
    }
    
    function addMockupEvents(){
        addEvent("Bridgewater","1878","set-locale","38.3771809888396,-79.03095281203701","",1);
        addEvent("Bridgewater","1878","set-affiliation","Cooks Creek","",1);
        addEvent("Bridgewater","1907/11","set-weight","201","",1); addEvent("Bridgewater","1878/06/22","photo","https://photos.app.goo.gl/XCJtqEQEyVsfogGEA","",1);
        addEvent("Bridgewater","1907","set-affiliation","2nd District of Virginia","[Bridgewater] becomes independent from [Cooks Creek]",1);
        addEvent("Bridgewater","1915","set-tag","paid minister","",1);
    }
    */
    
    
    function getAllAssemblyNames(){
        return Object.keys(db.assemblies);
    }
    
    function getMennoniteAssemblyNames(){
        return Object.keys(db.assemblies).filter(name => db.assemblies[name].mb & mennonite);
    }
    
    function getBrethrenAssemblyNames(){
        return Object.keys(db.assemblies).filter(name => db.assemblies[name].mb & brethren);
    }
    
    function getJointAssemblyNames(){
        return Object.keys(db.assemblies).filter(name => db.assemblies[name].mb == 3);
    }
    
    function getNeitherAssemblyNames(){
        return Object.keys(db.assemblies).filter(name => db.assemblies[name].mb == 0);
    }
    
    function getDenomination(name){
        if (assemblyExists(name)) return db.assemblies[name].mb; else return 0;
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
    
    function removeInvalidEventReferences(id){
        let count = 0;
        const re = new RegExp('\['+id+'\]','g');
        
        function filterAffiliationEvents(assembly){
            db.assemblies[assembly].events = db.assemblies[assembly].events.filter(event =>{
                if (event.verb == "set-affiliation" && event.object == id ){count++; return false;} //filter it out
                else return true;
            });
        }
        
        function clobberNoteReferences(assembly){
            db.assemblies[assembly].events.forEach(event =>{ 
                let c = (event.note.match(re) || []).length; //match can return null
                if (c) event.note = event.note.replaceAll('['+id+']','???');
                count += c;
            });
        }
    
        //scan and remove set-affiliation events whose objects == id, maintaining order of events
        Object.keys(db.assemblies).forEach(assembly => { 
            filterAffiliationEvents(assembly); 
            clobberNoteReferences(assembly);
        });
        
        return count;
    }
    
    //returns the number of invalidated references that have been removed
    function deleteAssembly(name){
        //tosses assembly and its assemblyData, including all events therein.
        const id = db.assemblies[name].id;
        delete db.assemblies[name]; //doesn't throw anything if it doesn't exist.
        delete idToName[id]; //maintain idToName
        return removeInvalidEventReferences(id);
    }
    
    //------ refs, whether idRefs [id], or namerefs [name]
    
    function cutOffEnds(ref){ return ref.substr(1,ref.length-2); }
    
    function addBrackets(str) { return "[" + str + "]"; }
    
    function nameRefToIdRef(nameRef){
        return addBrackets(db.assemblies[cutOffEnds(nameRef)].id);
    }
    
    function idRefToNameRef(idRef){
        return addBrackets(idToName[cutOffEnds(idRef)]);
    }
    
    //------------------------ Events ------------------------------------
    // The events of an assembly are an array ordered by date.
    // The array index number of a given event can be changed by addition or deletion of other event.
    // But if there have been no intervening additions or deletions (beware concurrent access)
    // then an event's indexed position within getEventStrings
    // can be used to delete that event.
    // There is no changeEvent: you have to first delete the old event and then add a new one.
    
    function naiveEvent(date,verb,object,note){
        this.date = date;
        this.verb = verb;
        this.object = object;
        this.note = note;
    }
    
    //returns "ok" if it succeeds, else an error statement
    //if justChecking is true, do not do final add, just do all the checks
    function addEvent(subjectAssembly,date,verb,object,note, doIt){ 
        
        function placeValidatedEvent(){
            
            function compareDates(e1,e2){return (e1.date < e2.date)?-1:((e1.date > e2.date)?1:0);}
            
            const evs = db.assemblies[subjectAssembly].events;
            evs.push(new naiveEvent(date,verb,object,note));
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
            if(doIt) placeValidatedEvent(subjectAssembly,date,verb,object,note);
            return "ok";
        }
    }
    
    function critiqueVerbObject(verb, object){
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
            case "set-tag":
                if (db.tags[object]) return "ok";
                else return "unrecognized tag";
            case "see-note":
                if (object.length > 0) return "see-note object should be blank. Put info in note.";
                else return "ok";
            default: 
                return "verb not recognized";

        }
    }
    
    function allDigits(candidate,start,len){
        const snippet = candidate.substr(start,len);
        if ( snippet.length != len) return false;
        return /^\d+$/.test(snippet);
    }
    
    //A date 
    //is "yyyy      "
    //or "yyyy/mm   "
    //or "yyyy/mm/dd"
    //boolean
    //unfinished: but 30 days hath sept,apr,jun and nov. And feb
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
        //check for 30 days hath september, etc...
        let mm = parseInt(candidate.substr(5,2),10)-1; //Date requires 0 based months
        let d = new Date( parseInt(candidate.substr(0,4),10), mm, parseInt(candidate.substr(8,2),10));
        //Given too many days, like the 29th feb in a non-leap-year month, Date constructor wraps it into the following month...
        if (d.getMonth() != mm) return "That month doesn't have that many days." 
//      if (candidate.substr(8,2)<"01" || candidate.substr(8,2) > "31") return "date day out of range"; //short months sneak through
        return "ok"; //yyyy/mm/dd
    }

    //returns modified str
    //replacing each [id] reference with [name] reference
    function idRefsToNameRefs(str){ 
        let refs = str.match(/\[\d+\]/g) ; //returns an array of refs "[d+]" from the strings
        if (!refs) return str;
        refs = refs.map(ref=>cutOffEnds(ref));
        refs.forEach(ref => { if (!idToName[ref]) throw ref+" is an unknown assembly reference.";}) ;
        refs.forEach(ref=> { str = str.replace(ref,idToName[ref]);});
        return str;
    }
    
    //returns modified str
    //replacing each [name] reference with [id] reference
    function nameRefsToIdRefs(str){ //replace each [name] reference with [id] reference
        let refs = str.match(/\[.+?\]/g) ; //returns an array of refs "[xxx]" from the strings
        if (!refs) return str;
        refs = refs.map(ref=>cutOffEnds(ref).trim());
        refs.forEach(ref => { if (!db.assemblies[ref]) throw ref + " is not a known assembly."; });
        refs.forEach(ref=> { str = str.replace(ref,db.assemblies[ref].id);});
        return str;
    }
    
    //returns naiveEvent of dereferenced strings
    function stringEvent(ev){
        return new naiveEvent( ev.date, ev.verb, (ev.verb == "set-affiliation")?idToName[ev.object]:ev.object, idRefsToNameRefs(ev.note));
    }
                         
    //returns an array of eventToStrings corresponding to the events of an assembly
    //the indices of events in this array are valid to use in deleteEvent IFF there have been no addEvents or
    //other deleteEvents in between. So every time you delete one, you have to getEventStrings again,
    //so your indices are good.
    function getEventStrings(assemblyName){ 
        
        //flesh out date with trailing blanks to be (at least) len chars long.
        function buff(date,len){ 
            if (len <= date.length) return date;
            else return date + " ".repeat(len-date.length);
        }
        
        function eventToString(ev){
            let sev = stringEvent(ev);
            return buff(sev.date,10) + ' ' + sev.verb + (sev.object.length?(' '+sev.object):'') + (sev.note.length?(" note:"+ sev.note):"");
        }
        
        if (assemblyExists(assemblyName)) {
            return db.assemblies[assemblyName].events.map(ev => eventToString(ev));
        }
        else return [];
    }
    
    function getStringEvent(assemblyName,index){
        if (assemblyExists(assemblyName) && index >=0 && index < db.assemblies[assemblyName].events.length) return stringEvent(db.assemblies[assemblyName].events[index]);
        else return null;
    }
        
    function deleteEvent(assemblyName,index){
        if (index && assemblyExists(assemblyName)) db.assemblies[assemblyName].events.splice(index,1); //remove the indexed event
    }
    
    //used to initialize db.assemblies from file
    function setData(data){
        db.assemblies = data;
        buildIdToName();
    }
    
    //used to create a file copy of db.assemblies
    function getData(){
        return JSON.stringify(db.assemblies);
    }
    
    //init();
    
    return {getVerbs:getVerbs,
            getTags:getTags,
            getTags:getTags,
            cutOffEnds:cutOffEnds,
            yearLater:yearLater,
            
            getData:getData,
            setData:setData,
            
            getAllAssemblyNames:getAllAssemblyNames,
            getMennoniteAssemblyNames:getMennoniteAssemblyNames,
            getBrethrenAssemblyNames:getBrethrenAssemblyNames,
            getNeitherAssemblyNames:getNeitherAssemblyNames,
            getJointAssemblyNames:getJointAssemblyNames,
            getDenomination:getDenomination,
            assemblyExists:assemblyExists,
            addAssembly:addAssembly,
            changeAssembly:changeAssembly,
            deleteAssembly:deleteAssembly,
            
            addEvent:addEvent,
            getStringEvent:getStringEvent,
            getEventStrings:getEventStrings,
            deleteEvent:deleteEvent,
            
            //temporary, for testing only
            db:db
           };
}
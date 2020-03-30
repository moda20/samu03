var Excel = require('exceljs');
const path = require('path');
var bootbox = require('bootbox');
var bootstrap = require('bootstrap');
$(document).ready(function() {
  console.log("DOCUMENT READ");

  //Creating DB



  console.log(window.db);

  let xlsPath="";
  let isSynchronizationOn =true;
  let Globalworkbook;

  let statusBuffer=[];

  let dataSet=[

  ];

  let Columns=[
    { key:"", title: "Nom" },
    { key:"", title: "Prenom" },
    { key:"", title: "Age" },
    { key:"", title: "Numero de telephone" },
    { key:"", title: "Origine" },
    { key:"", title: "sexe", tType:"MultiRadio", tValue:["F","M"]},
    { key:"", title: "Pays contact", tType:"textarea"},
    { key:"", title: "Antecedents", tType:"textarea"},
    { key:"", title: "Symptomatologies", tType:"MultiCheckBox", tValue:["fièvre" , "toux sèche", "maux de gorge", "dyspnée", "signes digestifs" , "asthénie/myalgies"]},
    { key:"", title: "Autre Signes", tType:"textarea"},
    { key:"", title: "Medecin" },
    { key:"", title: "Date"},
    { key:"", title: "Heur"},
    { key:"", title: "Decision", tType:"MultiRadio", tValue:["Conseil/Non Suspect", "Isolement", "Prélevement"]},
    { key:"", title: "SMUR"},
  ];


  _init = function(){
    ///serializing DB

    window.db.serialize(Columns.map((elem)=>{
      return {title:splitjoin(elem.title)}
    }));
    ///Getting DBData
    getDatabaseData();



    ///Getting METADBData
    getDatabaseMetaData();

    ///Launching the datatable
    $('#mainTable').DataTable(
        {
          data: dataSet,
          columns: Columns.map((elem)=>{
            return {title:elem.title}
          }),
          responsive: true,
        }
    );

  }


  ///Getting DBData

  getDatabaseData = function(){
    startLoader("addingModal");
    window.db.getAllPatientsData().then(
        data=>{
          dataSet=data.map((elem)=>{
            let interElem =[];
            Columns.forEach((column)=>{
              interElem.push(elem[splitjoin(column.title)]);
            });
            return interElem;
          });
          endLoader("addingModal");
          updateDatatable();
        }
    ).finally(()=>{
      endLoader("addingModal");
    })
  }


  ///getting DBMetadata

  getDatabaseMetaData = function(){
    window.db.getMetaData().then(
        data=>{
          console.log(data);
          let metaData = data[0];
          isSynchronizationOn= metaData["autoSync"]==1;
          xlsPath= metaData["xlsFilePath"];
          console.log(isSynchronizationOn,xlsPath);
          updateMetaData();
        }
    ).catch(err=>{
      console.log("not data found, adding the data ourselves");
      updateDatabaseMetaData();
    })

  }


  ///Updating DBMetadata

  updateDatabaseMetaData = function(){
    let data={};
    data["xlsFilePath"] = xlsPath;
    data["autoSync"] = isSynchronizationOn==true?1:0;
    window.db.updateMetaData(data);
    updateMetaData();
  }











  createExcelFile =  function() {
    if(xlsPath.length!=0){

      // A new Excel Work Book
      var workbook = new Excel.Workbook();
      Globalworkbook = workbook;
      // Some information about the Excel Work Book.
      workbook.creator = 'samu03';
      workbook.lastModifiedBy = 'samu03';
      workbook.created = new Date();
      workbook.modified = new Date();
      workbook.lastPrinted = new Date();

      // Create a sheet
      var sheet = workbook.addWorksheet('Patients');
      // A table header
      sheet.columns = Columns.map((elem)=>{
        return {header: elem.title, key:  splitjoin(elem.title), width: 20};
      });

      dataSet.forEach((dataeach)=>{
        object = {};
        Columns.forEach((elem,index)=>{
          object[splitjoin(elem.title)]=dataeach[index];
        });
        console.log(object);
        sheet.addRow(object);
      });

      // Save Excel on Hard Disk
      workbook.xlsx.writeFile(xlsPath)
          .then(function() {
            // Success Message
            alert("File Saved");
            //Updating the xlsPath in the database
            updateDatabaseMetaData();
          });
    }

  }

  saveToExcel = function (data){
    const ipc = require('electron').ipcRenderer;
    ipc.send('open-file-dialog');

    ipc.on('selected-file', function (event, path) {

    console.log(path);
    if(path.canceled==false){
      xlsPath = path.filePath;
      createExcelFile();
    }
    })
  }


  updateExcel = async function (newData) {
    if(!Globalworkbook && xlsPath && xlsPath!=""){
      console.log("needsTo read File");
      Globalworkbook = new Excel.Workbook();
      Globalworkbook = await Globalworkbook.xlsx.readFile(xlsPath);
    }
    if(Globalworkbook){
      let sheet = Globalworkbook.getWorksheet('Patients');
      sheet.columns = Columns.map((elem)=>{
        return {header: elem.title, key:  splitjoin(elem.title), width: 20};
      });
      sheet.addRow(newData);
      Globalworkbook.modified = new Date();

      Globalworkbook.xlsx.writeFile(xlsPath)
          .then(function() {
            // Success Message
            writeTobuffer("ligne Numero : "+(sheet.rowCount-1)+" ajoutée au fichier excel avec success");
          });
    }
  }


  addRowAndClose = function (){
    addRow();
    $('#addingModal').modal('hide');
  }

  addRow = function(){
    let data=[];
    let object={};
    Columns.map((elem,index)=>{
      let itemData;
      switch (elem.tType) {
        case "MultiRadio":{
          itemData =$("input[name='"+splitjoin(elem.title)+"']:checked").val()||"";
          break;
        }
        case "MultiCheckBox":{
          let chekcBoxValues=[];
          $(`#cbk_${splitjoin(elem.title)}:checked`).each(function(i){
            chekcBoxValues.push($(this).val());
          });
          itemData=chekcBoxValues.join(', ')||"";
          console.log(itemData);
          break;
        }
        case "textarea":{
          itemData=$("#id_"+splitjoin(elem.title)).val()||"";
          break;
        }
        default:{
          itemData=$("#id_"+splitjoin(elem.title)).val()||"";
          break;
        }
      }

      data.push(itemData);
      object[splitjoin(elem.title)]=itemData
    });
    console.log(data);
    dataSet.push(data);
    if(isSynchronizationOn==true){
      updateExcel(object);
    }
    addDbRow(data);
    updateDatatable();
  };

  function splitjoin(s){
    return s.split(' ').join('');
  }

  /// Adding dbRow

  addDbRow = function(rowData){


    window.db.addSingleRow(rowData);

  }
  addRowAndErase =  function (){
    addRow();
    Columns.map((elem)=>{
      $("#id_"+splitjoin(elem.title)).val('')
    });
    $("#id_"+splitjoin(Columns[0].title)).focus();
  };


  updateDatatable = function(){
    ///if the number of rows is big the table needs to be cleared by the browser
    //before datatables does it's job
    if(dataSet.length>1000){
      $('#mainTable').empty();
    }
    if ($.fn.dataTable.isDataTable('#mainTable')) {
      $('#mainTable').DataTable().destroy();
    }

    $('#mainTable').DataTable({
      responsive: true,
      destroy: true,
      data: dataSet,
      columns: Columns.map((elem)=>{
        return {title:elem.title}
      }),
    });
  }

  updateMetaData = function(){
    //Nothing to do yet
    if(isSynchronizationOn==true){
      $("#autosync").html(
          `<span class="pull-right bullet green"></span>Activée`
      )
    }else{
      $("#autosync").html(
          `<span class="pull-right bullet red"></span>Désactivée`
      )
    }
  }

  openAddRowModal= function (){
    let modalForm=``;



    Columns.map((elem)=>{
      let row='';
      switch (elem.tType) {
        case "MultiCheckBox":{
          if(elem.tValue){
            row='';
            elem.tValue.forEach((velem,index)=>{
              row+=`<div class="form-check-inline">
                      <label class="form-check-label">
                        <input type="checkbox" class="form-check-input" name="${splitjoin(elem.title)}" id="cbk_${splitjoin(elem.title)}" value="${velem}">${velem}
                      </label>
                    </div>`
            })
          }
          row = `
           <div class="col-6">
                <div class="input-group mb-3">
                  <div class="input-group-prepend">
                    <span class="input-group-text" id="basic-addon1">${elem.title}</span>
                  </div>
                 <div style="border:1px solid #ced4da; width: 1%; flex: 1 1 auto;" class="form-control">
                 ${row}
                  </div>
                  <input hidden id="${splitjoin(elem.title)}checkboxvalue">
                </div>
              </div>
          `

          //setting callbacks


          break;
        }

        case "MultiRadio":{

          if(elem.tValue){
            row='';
            elem.tValue.forEach((velem,index)=>{
              row+=`<div class="form-check-inline" >
                      <label class="form-check-label" >
                        <input type="radio" class="form-check-input" name="${splitjoin(elem.title)}" value="${velem}">${velem}
                      </label>
                    </div>`
            })
          }
          row = `
            <div class="col-6">
                <div class="input-group mb-3">
                  <div class="input-group-prepend">
                    <span class="input-group-text" id="basic-addon1">${elem.title}</span>
                  </div>
                 <div style="border:1px solid #ced4da; width: 1%; flex: 1 1 auto;" class="form-control">
                 ${row}
                  </div>
                </div>
              </div>
          `
          break;
        }
        case "textarea":{
          row=`
              <div class="col-6">
                <div class="input-group mb-3">
                  <div class="input-group-prepend">
                    <span class="input-group-text" id="basic-addon1">${elem.title}</span>
                  </div>
                  <input type="text" class="form-control" id="id_${splitjoin(elem.title)}" placeholder="${elem.title}" aria-label="${splitjoin(elem.title)}" aria-describedby="basic-addon1">
                </div>
              </div>
            `
          break;
        }
        default:{
          row=`
              <div class="col-6">
                <div class="input-group mb-3">
                  <div class="input-group-prepend">
                    <span class="input-group-text" id="basic-addon1">${elem.title}</span>
                  </div>
                  <input type="text" class="form-control" id="id_${splitjoin(elem.title)}" placeholder="${elem.title}" aria-label="${splitjoin(elem.title)}" aria-describedby="basic-addon1">
                </div>
              </div>
            `
        }
      }


      modalForm+='<br>';
      modalForm+= row
    });
    $("#modalBody").html(modalForm);
    $('#addingModal').modal();
    $("#id_"+splitjoin(Columns[0].title)).focus();
  };



  //Excel import

  importExcelFile = function(){
    const ipc = require('electron').ipcRenderer;
    ipc.send('open-excel-file-dialog');

    ipc.on('selected-excel-file', function (event, path) {

      console.log(path);
      if(path.canceled==false){
        xlsPath = path.filePaths[0];
        startLoader("wrapper");
        readExcelFile(xlsPath).then(
            fileRead =>{
              let sheet = Globalworkbook.getWorksheet('Patients');

              sheet.eachRow(function(row, rowNumber) {
                console.log(rowNumber);
                let bufferDataSet=[];
                if(rowNumber>1){
                  let dataToAdd =fillArray(row.values.splice(1),Columns.length);
                  dataSet.push(dataToAdd);
                  addDbRow(dataToAdd);
                }
              });
              writeTobuffer(`${sheet.rowCount} lignes ont été ajoutées depuis le fichier excel`);

            }
        ).finally(()=>{
          //Will update the Excel path in the DB and update the visuals
          updateDatabaseMetaData();
          //Will update the datatable to account for all the new adddings
          updateDatatable();
          endLoader("wrapper");
        });
      }
    })
  }


  /// Utils functions

  writeTobuffer = function(data){
    statusBuffer.push(data);
    if(statusBuffer.length>5){
      delete  statusBuffer[0];
    }
    writeBufferToHTML();
  };

  writeBufferToHTML=function(){
      let HTML = '';

      statusBuffer.forEach((elem,index)=>{
        HTML+=`<li>${elem}<span class="pull-right bullet green"></span></li>`;
      })

      $("#historylist").html(HTML);
  };

  startLoader =function(id){
    $(`#${id}`).addClass("loading");
  };

  endLoader = function(id){
    $(`#${id}`).removeClass("loading");
  };

  openExcellFile= function(){
    if(xlsPath && xlsPath!=""){
      console.log(xlsPath);
      const ipc = require('electron').ipcRenderer;
      ipc.send('open-os-explorer', path.dirname(xlsPath));
    }
  };

  resetLocalData = function(){
    isSynchronizationOn=true;
    dataSet=[];
    $("#mainTable").empty();
    xlsPath='';
    Globalworkbook=null;
  }

  readExcelFile= async function(path) {
    if(!path){
      throw "null path";
    }
    let workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(path);
    Globalworkbook= workbook;
  }

  //Method to fill arrays with empty values to get to the minimum number for datatables
  //to function properly
  fillArray= function(array,arrayLength,data){
    let newArray = Object.assign([],array);
    for(let i=0; i<arrayLength-array.length; i++){
      newArray.push(data||null);
    }
    return newArray;
  }


  //Db reset
  resetDatabase= async function(){

    bootbox.confirm(
        {
          locale:"fr",
          title:"Confirmer la réinitialisation",
          message:"Est ce que vous êtes sur de réinitialiser la base de donnée <br> <b class='text-danger'>(Pas de retour possible). </b>" +
              "Les données en fichier excel ne seront pas touchés mais, la synchronisation automatique sera perdue.",
          callback: async (result)=> {
            if(result===true){
              startLoader("wrapper");
              await window.db.deleteAllMetaData();
              await window.db.deleteAllData();
              resetLocalData();
              updateDatabaseMetaData();
              updateDatatable();
              writeTobuffer("réinitialisation faite avec succèes");
              endLoader("wrapper");
            }
          }
        });
  };







  //Launching the init function
  _init();
});

var uploader = null;
function createUploader(upload_dir){
    uploader = new qq.FileUploader({
       element: document.getElementById("file-uploader"),
       action: "/libs3/valums/upload.php?dstdir=/bluejay/" + upload_dir,
       debug: true,
       onComplete: function(id, file, responseJSON){
           var extension = file.substr( (file.lastIndexOf('.') +1) );
           var basename = file.substr( file.lastIndexOf('/') +1 );
           var file = basename.substr(0, basename.lastIndexOf('.'));           if(extension == 'ply') {
               $.ajax({
                  url: "/bluejay/plytojson.php?a=loadobj&sandboxdir=" + upload_dir + "&file=" + file,
                  type: "POST",
                  data: "",
                  success: function(result){
                      console.log(result);
                      if(result.length>0) {
                          var obj = JSON.parse(result);
                          if(obj.ret == 0){
                              objects.push(loadObject(obj));
                              $("#selected_obj").append($('<option/>', {
                                                              value: objects.length - 1,
                                                              text : file
                                                          }));
                          }
                      }
                  }});
           }
       }
   });
}

function addObject(json) {
    var obj = loadObject(JSON.parse(json));
    if(!obj) { console.log("failed to parse json object"); return; }
    objects.push(obj);
    var path = obj.file;
    var basename = path.split("/").reverse()[0];
    var objname = basename.substr(0, basename.lastIndexOf("."));
    $('#selected_obj').append($('<option/>', {
                                value: objects.length - 1,
                                text : objname
                            }));
}


function removeAllObjects(sandboxDir) {
    $.ajax({
        url: "/bluejay/plytojson.php?a=rm&" + "&sandboxdir=" + sandboxDir,
        type: "POST",
        data: "",
        success: function(result){
            console.log(result);
            objects = [];
            var idx = 0;
            $.each($("#selected_obj option"), function(){
                if(idx > 0) {//dont remove first item: World
                    $(this).remove();
                }
                idx++;
            });
        }});
}

function removeSelectedObject(sandboxDir) {
    var selected_obj_idx = $("#selected_obj").prop("selectedIndex")-1;
    console.log("#### " + selected_obj_idx + ", objects ");
    console.log(objects);
    var basename = objects[selected_obj_idx].file.substr(
                objects[selected_obj_idx].file.lastIndexOf('/') +1);
    var file = basename.substr(0,
                basename.lastIndexOf('.'));

    $.ajax({
        url: "/bluejay/plytojson.php?a=rm&" + "&sandboxdir=" + sandboxDir + "&file=" + file,
        type: "POST",
        data: "",
        success: function(result){
            objects.splice(selected_obj_idx, 1);
            console.log("deleting selected_obj_idx " + selected_obj_idx);
            $("#selected_obj").find("option:selected").remove().end();
            document.getElementById("selected_obj").selectedIndex = selected_obj_idx;
        }});
}

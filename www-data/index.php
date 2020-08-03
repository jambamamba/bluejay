<?php

$err=null;

define ('DEFINE__MAX_EDITOR_DATA_LENGTH', 100000);
require_once '../libs1/html_purify.php';
require_once '../libs1/lib.php';

my_session_start();
html_purify($_REQUEST, $err);

extract($_REQUEST);
$a = (isset($_REQUEST['a'])) ? $_REQUEST['a'] : '';

//$fplog = fopen('log.txt', 'wt');
//fprintf($fplog, 'hello -xxx- %s\n', print_r($_REQUEST, true));
//fclose($fplog);

function html($objects) {
    $ret =
    '<!doctype html>
    <html>
       <head>
           <link rel="stylesheet" type="text/css" href="/libs3/valums/fileuploader.css" />
           <link rel="stylesheet" type="text/css" href="style.css" />
           <script src="/libs3/valums/fileuploader.js" type="text/javascript"></script>
           <script src="/libs3/jquery.min.js" type="text/javascript"></script>
           <script src="plyloader.js" type="text/javascript"></script>
       </head>
       <body>
          <canvas  id = "canvas"></canvas>
          <script src="bluejay.js"></script>
      <div id="toolbar" ><!--tool button bar-->
          <div id="select">
            <select id="selected_obj">
                <option value="-1">World</option>
            </select>
          </div>
          <div id="pan">
            <input class="toolbar-button" type="image" src="toolbar/pan.png" value="Pan"></input>
          </div>
          <div id="zoom">
            <input class="toolbar-button" type="image" src="toolbar/zoom.png" value="Zoom"></input>
          </div>
          <div id="rotate">
            <input class="toolbar-button" type="image" src="toolbar/rotate.png" value="Rotate"></input>
          </div>
          <div id="delete">
            <input class="toolbar-button" type="image" src="toolbar/delete.png" value="Delete"></input>
          </div>
           <div id="reload">
            <input class="qq-upload-button" type="button" value="Reload"></input>
          </div>
          <div id="upload_area">
              <div id="file-uploader" ></div><!--file-uploader-->
          </div><!--upload-area-->
      </div><!--tool button bar-->
      </body>
      <script>
          window.onload = function() {
              createUploader("sandbox/'.session_id().'");
              ';
              foreach ($objects as &$obj) {
                $ret .= '
                addObject(\''.$obj.'\');
                  ';
              }
              $ret.='
              $("#delete").click(function(){
                if($("#selected_obj").prop("selectedIndex") == 0) {
                    removeAllObjects("sandbox/'.session_id().'");
                }
                else {
                    removeSelectedObject("sandbox/'.session_id().'");
                }
              });
              $("#rotate").click(function(){
                context.action = A_ROTATE
              });
              $("#pan").click(function(){
                  context.action = A_PAN;
              });
              $("#reload").click(function(){
                  context.action = A_RELOAD;
                  location.reload();
              });
              $("#zoom").click(function(){
                  context.action = A_ZOOM;
              });
           };
      </script>
    </html>
    ';
    return $ret;
}

function loadObjects() {
    $objects = array();
    $path = 'sandbox/'.session_id();
    if(is_dir($path)){
        $dir = new DirectoryIterator($path);
        foreach ($dir as $fileinfo) {
            if (!$fileinfo->isDot()) {
                if(pathinfo($path .'/'. $fileinfo->getFilename())['extension'] == 'js') {
                    $objects[] = readf($path .'/'. $fileinfo->getFilename());
                }
            }
        }
    }
    return $objects;
}

//$fplog = fopen("log.txt", "wt");
//fprintf($fplog, "hello -xxx- %s\n", $log);
//fclose($fplog);

echo html(loadObjects());
?>

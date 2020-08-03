<?php

$err=null;

define ('DEFINE__MAX_EDITOR_DATA_LENGTH', 100000);
require_once '../libs1/html_purify.php';
require_once '../libs1/lib.php';

my_session_start();
html_purify($_REQUEST, $err);

extract($_REQUEST);
$a = (isset($_REQUEST['a'])) ? $_REQUEST['a'] : '';
$sandboxdir = (isset($_REQUEST['sandboxdir'])) ? $_REQUEST['sandboxdir'] : 'sandbox';
$file = (isset($_REQUEST['file'])) ? $_REQUEST['file'] : '';

//$fplog = fopen('log.txt', 'wt');
//fprintf($fplog, 'hello -xxx- %s\n', print_r($_REQUEST, true));
//fclose($fplog);

function startObjectDeclaration($fp, $type)
{
    if($fp) {fprintf($fp, "\tvar %s=[", $type);}
}
function endObjectDeclaration($fp)
{
    if($fp) {fprintf($fp, "];\n");}
}
function combine($sandboxdir, $vertices, $indices, $normals, $texture, $image_src, $log, $file, $ret){

    $obj = '{';

    $obj .= '"ret":"'.$ret.'"';
    $obj .= ',"file":"'.$sandboxdir.'/'.$file.'.ply"';
    $obj .= ',"log":"'.$log.'"';
    $obj .= ',"image_src":"'.$image_src.'"';

    $obj .= ',"vertices":[';
    $obj .= $vertices;
    $obj .= ']';


    $obj .= ',"indices":[';
    $obj .= $indices;
    $obj .= ']';

    $obj .= ',"normals":[';
    $obj .= $normals;
    $obj .= ']';

    $obj .= ',"texture":[';
    $obj .= $texture;
    $obj .= ']';

    $obj .= ',"colors":[';
    $obj .= ']';

    $obj .= '}';

    return $obj;
}
function main(&$log, &$obj, $sandboxdir, $polygon) {

    $ret = -1;

    $vertices = '';
    $texture = '';
    $indices = '';
    $normals = '';

    $state_vertices = false;
    $state_faces = false;
    $num_vertices = 0;
    $num_faces = 0;
    $buffer = '';
    $buffersz = 4096;
    $fpin = null;
    $fpout = null;

    if(!is_dir($sandboxdir)) {
        if(!mkdir($sandboxdir, 0755, true)) {
            $log = 'invalid input file: '.$sandboxdir.'/'.$polygon.'.ply';
            goto end;
        }
    }

    $fpin = fopen($sandboxdir.'/'.$polygon.'.ply', 'rt');
    if(!$fpin) {
        $log = 'invalid input file: '.$sandboxdir.'/'.$polygon.'.ply';
        goto end;
    }

    $first = true;
    while(($buffer = fgets($fpin, $buffersz))) {
        //$log .= $buffer;

        if($state_vertices && $num_vertices > 0) {
            $x=0; $y=0; $z=0; $nx=0; $ny=0; $nz=0; $s=0; $t=1;
            list($x, $y, $z, $nx, $ny, $nz, $s, $t) = sscanf($buffer, "%f %f %f %f %f %f %f %f");
            $vertices .= sprintf("%s%f,%f,%f", !$first ? ',':'', $x,$y,$z);
            $normals .= sprintf("%s%f,%f,%f", !$first ? ',':'', $nx,$ny,$nz);
            $texture .= sprintf("%s%f,%f", !$first ? ',':'', $s,$t);
            $num_vertices--;
            if($first) { $first = false; }
            if($num_vertices == 0) {
                $state_vertices = false;
                $state_faces = true;
                $first = true;
            }
        }
        else if($state_faces && $num_faces > 0) {
            $n=0; $x=0; $y=0; $z=0;
            list($n, $x, $y, $z) = sscanf($buffer, "%d %d %d %d");
            if($n != 3) {
                $log = 'faces must be triangles!, cannot be '. $n;
                break;
            }
            $indices .= sprintf("%s%d,%d,%d", !$first ? ',':'', $x, $y, $z);
            $num_faces--;
            if($first) { $first = false; }
            if($first) { $first = false; }
            if($num_faces == 0) {
               $first = true;
                break;
            }
        }
        if(strstr($buffer, 'element vertex')) {
            list($num_vertices) = sscanf($buffer, "element vertex %d");
            $log = 'num_vertices: '. $num_vertices;
        }
        else if(strstr($buffer, 'element face')){
            list($num_faces) = sscanf($buffer, "element face %d");
            if($num_faces > 65535) {
                $log = 'cannot have more than 65535 indices, you have '. $num_faces;
                break;
            }
            $log = 'num_faces: '. $num_faces;
        }
        else if(strstr($buffer, 'end_header')){
            $state_vertices = true;
        }
        $buffer = '';
    }

    $ret = 0;
    $log = 'created object';
    $obj = combine($sandboxdir, $vertices, $indices, $normals, $texture, $sandboxdir.'/'.$polygon.'.jpg', $log, $polygon, $ret);

    $fpout = fopen($sandboxdir.'/'.$polygon.'.js', 'wt');
    if(!$fpout) {
        $log = 'could not create output file: '.$sandboxdir.'/'.$polygon.'.js';
        goto end;
    }
    fwrite($fpout, $obj, strlen($obj));
    fclose($fpout);

end:
    return $ret;
}

if($a == 'loadobj') {
    $log = '';
    $obj = '';
    $polygon = basename($file, '.ply');
    $ret = main($log, $obj, $sandboxdir, $polygon);
    if($ret != 0) {
        $obj = '{"ret":'.$ret.',"log":"'.$log.'"}';
    }
    echo $obj;
}
else if($a == 'rm') {
    $path = dirname(__FILE__) . '/'.$sandboxdir;
    $dir = new DirectoryIterator($path);
    foreach ($dir as $fileinfo) {
        if (!$fileinfo->isDot()) {
            if($file != '') {//rm specific object file
                $path_parts = pathinfo(
                    $path .'/'. $fileinfo->getFilename());
                if($path_parts['filename'] == $file) {
                    unlink($path .'/'. $fileinfo->getFilename());
                }
            }
            else {
                unlink($path .'/'. $fileinfo->getFilename());
            }
        }
    }
}

//$fplog = fopen("log.txt", "wt");
//fprintf($fplog, "hello -xxx- %s\n", $log);
//fclose($fplog);

?>

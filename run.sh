#!/bin/bash
set -xe

inputdir=$1
outdir=$2
rootdir=$PWD/install
mkdir -p $outdir
python $rootdir/openMVG/software/SfM/SfM_GlobalPipeline.py $inputdir $outdir
pushd $outdir/reconstruction_global
$rootdir/openMVG/Linux-x86_64-RELEASE/openMVG_main_openMVG2openMVS -i sfm_data.bin -o scene.mvs -d scene_undistorted_images
$rootdir/openMVS/bin/DensifyPointCloud scene.mvs 
$rootdir/openMVS/bin/ReconstructMesh scene_dense.mvs
$rootdir/openMVS/bin/RefineMesh scene_dense_mesh.mvs --max-face-area 16
$rootdir/openMVS/bin/TextureMesh scene_dense_mesh_refine.mvs
$rootdir/openMVS/bin/Viewer scene_dense_mesh_refine_texture.ply
popd

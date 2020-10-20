#!/bin/bash
set -xe

#This script feteches sources needed for compiling openvMVG and openMVS

rootdir=$PWD
installdir=~/$DOCKERUSER/bluejay/install
srcdir=~/$DOCKERUSER/bluejay/src
mkdir -p $installdir
mkdir -p $srcdir

#eigen
cd $srcdir
rm -fr eigen*
git clone https://gitlab.com/libeigen/eigen.git
mkdir -p $installdir/eigen && cd $installdir/eigen  && rm -fr  $installdir/eigen/*
cmake -DCMAKE_INSTALL_PREFIX=$installdir/eigen $srcdir/eigen
make -j8
make install

#ceres-solver
cd $srcdir
rm -fr vcglib
rm -fr ceres-solver
git clone https://github.com/cdcseacave/VCG.git vcglib
git clone https://ceres-solver.googlesource.com/ceres-solver ceres-solver
mkdir -p $installdir/ceres-solver && cd $installdir/ceres-solver && rm -fr  $installdir/ceres-solver/*
cmake -DCMAKE_INSTALL_PREFIX=$installdir/ceres-solver -DCMAKE_PREFIX_PATH=$installdir/ceres-solver -DMINIGLOG=ON -DBUILD_TESTING=OFF -DBUILD_EXAMPLES=OFF $srcdir/ceres-solver
make -j8
make install

#openMVG
cd $srcdir
rm -fr openMVG
git clone --recursive https://github.com/jambamamba/openMVG.git
cd openMVG
git checkout oosman
git submodule update --recursive --init
mkdir -p $installdir/openMVG && cd $installdir/openMVG && rm -fr  $installdir/openMVG/*
cmake -DCMAKE_INSTALL_PREFIX=$installdir/openMVG -DCMAKE_BUILD_TYPE=RELEASE $srcdir/openMVG/src
make -j8
make install

#boost
cd $srcdir
wget https://dl.bintray.com/boostorg/release/1.72.0/source/boost_1_72_0.tar.gz
tar -xf boost_1_72_0.tar.gz -C $srcdir
cd $srcdir/boost_1_72_0
./bootstrap.sh
./b2 --with-atomic --with-chrono --with-date_time --with-filesystem --with-regex --with-serialization --with-thread --with-system --with-program_options --with-timer --with-iostreams --no-samples --no-tests  link=shared toolset=clang cxxflags="-fPIC -std=c++1y -stdlib=libc++" linkflags="-stdlib=libc++" -j 8

#opencv
cd $srcdir
rm -fr opencv-4.2.0
wget https://github.com/opencv/opencv/archive/4.2.0.zip
unzip 4.2.0.zip -d $srcdir
cd $srcdir/opencv-4.2.0
mkdir -p $installdir/opencv && cd $installdir/opencv && rm -fr  $installdir/opencv/*
cmake -DCMAKE_CXX_FLAGS="-std=c++1y -stdlib=libc++" -DCMAKE_INSTALL_PREFIX=$installdir/opencv $srcdir/opencv-4.2.0
make -j8

#openMVS
cd $srcdir
rm -fr openMVS
git clone --recursive https://github.com/jambamamba/openMVS.git
cd openMVS
git checkout oosman
git submodule update --recursive --init
mkdir -p $installdir/openMVS && cd $installdir/openMVS && rm -fr  $installdir/openMVS/*
BOOST_ROOT="$srcdir/boost_1_72_0" OpenCV_DIR=$installdir/opencv cmake -DCMAKE_INSTALL_PREFIX=$installdir/openMVS -DCMAKE_PREFIX_PATH="$installdir/eigen" -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=ON -DENABLE_PRECOMPILED_HEADERS=OFF -DVCG_ROOT="$srcdir/vcglib" $srcdir/openMVS
make -j8
make install

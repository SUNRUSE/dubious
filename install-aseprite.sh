if [ ! -f ephemeral/aseprite-bin/aseprite ] ; then
  rm -rf ephemeral/aseprite-bin
  rm -rf ephemeral/aseprite-git
  git clone https://github.com/aseprite/aseprite ephemeral/aseprite-git --depth 1 --branch v1.1.7 --recursive || exit 1
  cd ephemeral/aseprite-git || exit 1
  sudo apt-get update || exit
  sudo apt-get -y install cmake libx11-dev || exit 1
  mkdir build || exit 1
  cd build || exit 1
  cmake .. -G "Unix Makefiles" || exit 1
  cmake .  || exit 1
  make install # A failure is expected as it won't be able to copy the binary.
  cd ../../.. || exit 1
  if [ ! -f ephemeral/aseprite-git/build/bin/aseprite ] ; then
    echo "Failed to produce an asprite executable"
    rm -rf ephemeral/aseprite-git
    exit 1
  fi
  mv ephemeral/aseprite-git/build/bin ephemeral/aseprite-bin || exit 1
  rm -rf ephemeral/aseprite-git
fi

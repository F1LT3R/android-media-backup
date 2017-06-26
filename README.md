# Android Media Backup

> NodeJS script to backup android media files (photos, videos, etc).

- Currently this code just backs up everything without comparing old/new dates and sizes.
- The code backs up the whole directory structure (recursively going into subdirectories).
- The max read/write streams is currently 1.

## Installation

```
git clone git@github.com:f1lt3r/android-media-backup.git
yarn install
```

## Usage

```
cd android-media-backup
node index.js

# OUTPUT
# Finished: 1 of 384 > /Users/user/android-media-backup/Facebook/FB_IMG_1492702175634.jpg
# Finished: 2 of 384 > /Users/user/android-media-backup/Camera/VID_20170625_162534.3gp
# Finished: 3 of 384 > /Users/user/android-media-backup/Camera/VID_20170625_162038.3gp
# Finished: 4 of 384 > /Users/user/android-media-backup/Camera/VID_20170625_093705.3gp
```


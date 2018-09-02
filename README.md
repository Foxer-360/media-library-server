# Media Library Server
Allow developers upload to Amazon S3 store.

## Basic functionality
- [x] manage upload of file to S3
- [x] manage resize of images
- [x] manage files finger-prints (prevent duplicates)
- [ ] manage file searches based on filename and tags
- [ ] manage compression of images to mozjpeg

## Routes available
- [x] POST /storage - upload & resize(if dimensions provided) 
- [x] POST /createDimension - resize image when it's needed
- [x] GET /find - list & search in files
- [x] GET /findOne - find one file by id or hash

const mondaySdk = require("monday-sdk-js");
const monday = mondaySdk();
monday.setToken('eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjg5NjYwNDgyLCJ1aWQiOjE2NjY1NzIxLCJpYWQiOiIyMDIwLTExLTAxVDEzOjQzOjAyLjAwMFoiLCJwZXIiOiJtZTp3cml0ZSIsImFjdGlkIjo3MzM2MzM3LCJyZ24iOiJ1c2UxIn0.Snko3tzbKJyYoTPMAwK2mo0zzcgCl0xEXAjJEGcPB6Y');

module.exports = monday;

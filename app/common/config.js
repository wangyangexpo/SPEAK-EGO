'use strict'

var config = {
	header: {
		method: 'POST',
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
	},
	cloudinary: {
	    cloud_name: 'wangyangcloud',  
	    api_key: '969884576469964',
	    base: 'http://res.cloudinary.com/wangyangcloud',
	    image: 'https://api.cloudinary.com/v1_1/wangyangcloud/image/upload',
	    video: 'https://api.cloudinary.com/v1_1/wangyangcloud/video/upload',
	    audio: 'https://api.cloudinary.com/v1_1/wangyangcloud/raw/upload'
	},
	qiniu: {
		upload: 'http://up-z2.qiniu.com'
	},
	api: {
		// rap接口
		// base: 'http://rap.taobao.org/mockjs/14555/',
		// 本地接口
		base: 'http://localhost:8888/',
		creations: 'api/creations',
		up: 'api/up',
		comment: 'api/comments',
		signup: 'api/u/signup',
		verify: 'api/u/verify',
		signature: 'api/signature',
		update: 'api/u/update'
	}
};

export default config;
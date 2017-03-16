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
		upload: 'http://up-z2.qiniu.com',
		avatar_url: 'http://omhg2i5xo.bkt.clouddn.com/', // qiniu图片库地址（测试地址）
		computed_url: 'http://omsa0hz7y.bkt.clouddn.com/'
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
		update: 'api/u/update',
		video: 'api/creations/video',
		audio: 'api/creations/audio'
	},
	cloud: 'qiniu', // 图床云： ['qiniu', 'cloudinary']
	photoOptions: {
	    title: '选择头像',
	    cancelButtonTitle: '取消',
	    takePhotoButtonTitle: '拍照',
	    chooseFromLibraryButtonTitle: '从相册',
	    quality: 0.75,
	    allowsEditing: true,
	    noData: false,
	      storageOptions: {
	      skipBackup: true,
	      path: 'images'
	    }
	},
	videoOptions: {
		title: '选择视频',
	    cancelButtonTitle: '取消',
	    takePhotoButtonTitle: '录制10s视频',
	    chooseFromLibraryButtonTitle: '选择已有视频',
	    videoQuality: 'medium',
	    mediaType: 'video',
	    durationLimit: 10,
	    noData: false,
	      storageOptions: {
	      skipBackup: true,
	      path: 'images'
	    }
	}
};

export default config;
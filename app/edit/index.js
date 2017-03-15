import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
  ProgressViewIOS,
  AsyncStorage,
  AlertIOS,
  Modal,
  TextInput
} from 'react-native';

import _ from 'lodash';
import request from '../common/request'
import config from '../common/config'
import { showImagePicker } from 'react-native-image-picker';
import Video from 'react-native-video';
import { CountDownText } from 'react-native-sk-countdown';
import Icon from 'react-native-vector-icons/Ionicons';
import {AudioRecorder, AudioUtils} from 'react-native-audio';
import Sound from 'react-native-sound';
import { Circle } from 'react-native-progress';
import Button from 'react-native-button';

const width = Dimensions.get('window').width;
const height = Dimensions.get('window').height;
const signatureURL = config.api.base + config.api.signature;

const audioPath = AudioUtils.DocumentDirectoryPath + '/' + 'gougou.aac';

const defaultState = {
      previewVideo: null,

      videoId: null,
      audioId: null,

      // video play
      rate: 1,
      muted: true,
      resizeMode: 'contain',
      repeat: false,

      // video loads
      videoProgress: 0,
      videoTotal: 0,
      currentTime: 0,

      // upload
      video: null,
      paused: true,
      videoUploaded: false,
      videoUploading: false,
      videoUploadProgress: 0,

      // count down
      counting: false,
      recording: false,
      recordDone: false,

      // audio
      audioPlaying: false,

      // audio loads
      audio: null,
      audioUploaded: false,
      audioUploading: false,
      audioUploadProgress: 0,

      title: '',
      modalVisible: false,
      publishProgress: 0,
      publishing: false,
      willPublish: false
}

export default class Edit extends Component {
  constructor(props) {
    super(props);

    var user = this.props.user || {};
    var state = _.clone(defaultState);
    state.user = user;
    this.state = state;

    this._pickVideo = this._pickVideo.bind(this);

    this._onProgress = this._onProgress.bind(this);
    this._onEnd = this._onEnd.bind(this);
    this._onError = this._onError.bind(this);

    this._getQiniuToken = this._getQiniuToken.bind(this);
    this._upload = this._upload.bind(this);

    this._record = this._record.bind(this);
    this._counting = this._counting.bind(this);

    this._initAudio = this._initAudio.bind(this);
    this._preview = this._preview.bind(this);
    this._uploadAudio = this._uploadAudio.bind(this);
    this._getCloudinaryToken = this._getCloudinaryToken.bind(this);

    this._toggleModal = this._toggleModal.bind(this);
    this._submit = this._submit.bind(this);
  }

  _onLoadStart() {
    //console.log('start')
  }

  _onLoad() {
    //console.log('loading')
  }

  _onProgress(data) {

    var duration = data.seekableDuration;
    var currentTime = data.currentTime;
    var percent = Number((currentTime / duration).toFixed(2));

    this.setState({
        videoTotal: duration,
        currentTime: Number(currentTime.toFixed(2)),
        videoProgress: percent
    });

  }

  _onEnd() {
    AudioRecorder.stopRecording();
    this.setState({
      videoProgress: 1,
      recording: false,
      paused: true,
      recordDone: true
    })
  }

  _onError(err) {
  }

  _preview() {
    if(this.state.auidoPlaying) {
      AudioRecorder.stopPlaying()
    }

    // 播放视频和音频
    var sound = new Sound(audioPath, '', (error) => {
      if (error) {
        console.log('failed to load the sound', error);
      }
      console.log('duration in seconds: ' + sound.getDuration())
    });
    sound.setVolume(4);
    sound.play((success) => {
      if (success) {
        console.log('successfully finished playing');
      } else {
        console.log('playback failed due to audio decoding errors');
      }
    });

    this.refs.videoPlayer.seek(0);

    this.setState({
      videoProgress: 0,
      audioPlaying: true,
      paused: false
    })
    
  }

  _record() {

    this.refs.videoPlayer.seek(0);

    this.setState({
      videoProgress: 0,
      recording: true,
      counting: false,
      paused: false,
      recordDone: false
    })

    AudioRecorder.startRecording();

  }

  _counting() {
    if(!this.state.counting && !this.state.recording && !this.state.audioPlaying) {
      this.setState({
        counting: true
      })
    }
    
  }

  _pickVideo() {
    var _this = this;
    showImagePicker(config.videoOptions, (response) => {

      if (response.didCancel) {
        return;
      }

      var uri = response.uri;
      var state = _.clone(defaultState);
      state.previewVideo = uri;
      state.user = this.state.user;

      _this.setState(state)

      this._getQiniuToken(response);

    });
  }

  _getQiniuToken(response) {
    var _this = this;
    var uri = response.uri;
    var accessToken = this.state.user.accessToken;
    return request.post(signatureURL, {
        accessToken: accessToken,
        type: 'video',
        cloud: 'qiniu'
      })
      .catch((err) => {
        console.log(err)
      })
      .then((data) => {
          if(data && data.success) {

            var token = data.data.token;
            var key = data.data.key;
            var body = new FormData();

            body.append('token', token);
            body.append('key', key);
            body.append('file', {
              type: 'video/mp4',
              uri: uri,
              name: key
            });

            _this._upload(body,'video')
          }
        })
  }

  _getCloudinaryToken() {
    var _this = this;
    var accessToken = this.state.user.accessToken;
    var timestamp = Date.now();
    var tags = 'app,audio';
    var folder = 'audio';
    console.log(signatureURL);

    request.post(signatureURL, {
        accessToken: accessToken,
        timestamp: timestamp,
        type: 'audio',
        cloud: 'cloudinary'
      })
      .catch((err) => {
        console.log(err)
      })
      .then((data) => {
        console.log(data);
        if(data && data.success) {
          var token = data.data.token;
          var key = data.data.key;
          var body = new FormData();

          body.append('folder', folder);
          body.append('signature', token);
          body.append('tags', tags);
          body.append('api_key', config.cloudinary.api_key);
          body.append('resource_type', 'video');
          body.append('timestamp', timestamp);
          body.append('file', {
            type: 'video/mp4',
            uri: audioPath,
            name: key
          });

          _this._upload(body,'audio')
        }
      })
  }

  _upload(body,type) {
    var _this = this;
    var xhr = new XMLHttpRequest();
    var url;

    if(type === 'video') {
      url = config.qiniu.upload;
    } else {
      url = config.cloudinary.video;
    }

    var state = {};
    state[type + 'UploadProgress'] = 0;
    state[type + 'Uploading'] = true;
    state[type + 'Uploaded'] = false;

    _this.setState(state)

    xhr.open('POST', url);
    xhr.onload = () => {
      if(xhr.status != 200 || !xhr.responseText) {
        AlertIOS.alert('请求失败');
        console.log(xhr.responseText);
        return;
      }
      var response;

      try {
        response = JSON.parse(xhr.response)
      }
      catch(err) {
        console.log(err);
        console.log('parse fails')
      }

      console.log(response);

      if(response) {

        var newState = {};
        newState[type] = response;
        newState[type + 'Uploading'] = false;
        newState[type + 'Uploaded'] = true;
        _this.setState(newState)

        var mediaUrl = config.api.base + config.api[type];
        var accessToken = this.state.user.accessToken;
        var updateBody = {
          accessToken: accessToken
        };
        updateBody[type] = response;
        if(type === 'audio') {
          updateBody.videoId = _this.state.videoId;
        }

        request.post(mediaUrl, updateBody)
        .catch((err) => {
          console.log(err);
          if(type === 'video') {
            AlertIOS.alert('视频同步出错，请重新上传');
          } else if(type === 'audio'){
            AlertIOS.alert('音频同步出错，请重新上传');
          }
        })
        .then((data) => {
          console.log(data);
          if(data && data.success) {
            var mediaState = {};
            mediaState[type + 'Id'] = data.data;
            
            if(type === 'audio') {
              _this._toggleModal(true);
              mediaState.willPublish = true;
            }
            _this.setState(mediaState);
          }
          else {
            if(type === 'video') {
              AlertIOS.alert('视频同步出错，请重新上传');
            } else if(type === 'audio'){
              AlertIOS.alert('音频同步出错，请重新上传');
            }
          }
        })
        

      }
    }

    if(xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if(event.lengthComputable) {
          var percent = Number((event.loaded / event.total).toFixed(2));

          var progresState = {};
          progresState[type + 'UploadProgress'] = percent;
          _this.setState(progresState);
        }
      }
    }
    xhr.send(body);
  }

  _uploadAudio() {
    this._getCloudinaryToken();
  }

  _initAudio() {

    AudioRecorder.prepareRecordingAtPath(audioPath, {
      SampleRate: 22050,
      Channels: 1,
      AudioQuality: "High",
      AudioEncoding: "aac"
    });

    AudioRecorder.onProgress = (data) => {
      this.setState({
        currentTime: Math.floor(data.currentTime)
      });
    };

    AudioRecorder.onFinished = (data) => {
      console.log(data.audioFileURL);
    };
  }

  _toggleModal(bool) {
    this.setState({
      modalVisible: bool
    })
  }

  _submit() {
    var _this = this;
    var body = {
      title: this.state.title,
      videoId: this.state.videoId,
      audioId: this.state.audioId
    }

    var creationUrl = config.api.base + config.api.creations;
    var user = this.state.user;
    if(user && user.accessToken) {
      body.accessToken = user.accessToken;

      this.setState({
        publishing: true
      })
      request.post(creationUrl, body)
        .catch((err) => {
          console.log(err);
          AlertIOS.alert('视频发布失败');
        })
        .then((data) => {
          if(data && data.success) {
            //AlertIOS.alert('视频发布成功');
            var state = _.clone(defaultState);
            _this.setState(state);
          }
          else {
            _this.setState({
              publishing: false
            })
            AlertIOS.alert('视频发布失败')
          }
        })
    }
  }

  componentDidMount() {
    var _this = this;

    AsyncStorage.getItem('user')
      .then((data) => {
        var user = JSON.parse(data);
        if(user && user.accessToken) {
          _this.setState({
            user:user
          })
        }
      })

    this._initAudio();
  }

  render() {
    return (
      <View style={[styles.container]}>
        <View style={styles.toolBar}>
          <Text style={styles.toolBarTitle}>
            {
              this.state.previewVideo ? '' : '理解狗狗，从配音开始'
            }
          </Text>
          {
            this.state.previewVideo
            ? <Text style={styles.toolBarChange} onPress={this._pickVideo}>更换视频</Text>
            : null
          }
        </View>

        <View style={styles.page}>
          {
            this.state.previewVideo
            ? <View style={styles.videoContainer}>
                <View style={styles.videoBox}>
                  <Video 
                    ref='videoPlayer'
                    source={{uri: this.state.previewVideo}}
                    style={styles.video}
                    paused={this.state.paused}
                    rate={this.state.rate}
                    muted={this.state.muted}
                    resizeMode={this.state.resizeMode}
                    repeat={this.state.repeat}

                    onLoadStart={this._onLoadStart}
                    onLoad={this._onLoad}
                    onProgress={this._onProgress}
                    onEnd={this._onEnd}
                    onError={this._onError} />

                    {
                      !this.state.videoUploaded && this.state.videoUploading
                      ? <View style={styles.progressTipBox}>
                          <ProgressViewIOS
                            style={styles.progressBar}
                            progress={this.state.videoUploadProgress}
                            progressTintColor='#ee735c'/>
                          <Text style={styles.progressTip}>
                            正在生成静音视频，已完成{(this.state.videoUploadProgress * 100).toFixed(2)}%
                          </Text>
                        </View>
                      : null
                    }

                    {
                      this.state.recording || this.state.audioPlaying || this.state.recordDone
                      ? <View style={styles.progressTipBox}>
                          <ProgressViewIOS
                            style={styles.progressBar}
                            progress={this.state.videoProgress}
                            progressTintColor='#ee735c'/>
                            {
                              !this.state.recordDone
                              ? <Text style={styles.progressTip}>正在录音...</Text>
                              : <Text style={styles.progressTip}>录音完成。</Text>
                            }
                        </View>
                      : null
                    }

                    {
                      this.state.recordDone
                      ? <View style={styles.previewBox}>
                          <Icon name='ios-play' style={styles.previewIcon} />
                          <Text style={styles.previewText} onPress={this._preview}>
                            预览
                          </Text>
                        </View>
                      : null
                    }
                </View>
              </View>
            : <TouchableOpacity style={styles.uploadContainer} onPress={this._pickVideo}>
                <View style={styles.uploadBox}>
                  <Image source={require('../assets/image/record.jpg')}
                  style={styles.uploadIcon}
                  />
                  <Text style={styles.uploadTitle}>
                    点我上传视频
                  </Text>
                  <Text style={styles.uploadDesc}>
                    建议时长不超过 10 秒
                  </Text>
                </View>
              </TouchableOpacity>
          }
          
          {
            this.state.videoUploaded
            ?
            <View style={[styles.recordBox]}>
              <View style={[styles.recordIconBox, (this.state.recording || this.state.audioPlaying) && styles.recordOn]}>
                {
                  this.state.counting && !this.state.recording
                  ? <CountDownText
                      ref='countingDown'
                      style={styles.countBtn}
                      countType='seconds'
                      auto={false}
                      afterEnd={this._record}
                      timeLeft={3}
                      step={-1}
                      startText='准备录制'
                      endText='GO'
                      intervalText={(sec) => {
                        return ((sec === 0) ? 'GO' : sec);
                      }}
                      />
                  : <TouchableOpacity onPress={this._counting}>
                      <Icon name='ios-mic' style={styles.recordIcon}/>
                    </TouchableOpacity>
                }
              </View>
            </View>
            : null
          }

          {
            this.state.videoUploaded && this.state.recordDone
            ? <View style={styles.uploadAudioBox}>
                {
                  !this.state.audioUploaded && !this.state.audioUploading
                  ? <Text style={styles.uploadAudioText} onPress={this._uploadAudio}>下一步</Text>
                  : null
                }
                
                {
                  this.state.audioUploading
                  ? <Circle
                      showsText={true}
                      size={60}
                      color={'#ee735c'}
                      progress={this.state.audioUploadProgress}/>
                  : null
                }
              </View>
            : null
          }
        </View>

        <Modal
          animate={true}
          animationType={'slide'}
          visible={this.state.modalVisible}
          >
          <View style={styles.modalContainer}>
            <Icon name='ios-close-outline' style={styles.closeIcon} onPress={() => {
              this._toggleModal(false)
            }}/>
            {
              this.state.audioUploaded && !this.state.publishing
              ? <View style={styles.fieldBox}>
                  <TextInput 
                    placeholder={'狗狗宣言'}
                    style={styles.inputField}
                    autoCapitalize={'none'}
                    autoCorrect={false}
                    defaultValue={this.state.title}
                    onChangeText={(title) => {
                              this.setState({'title': title})
                            }}
                    />
                </View>
              : null
            }
            
            {
              this.state.publishing
              ? <View style={styles.loadingBox}>
                  <Text style={styles.loadingText}>生成视频中...</Text>
                  {
                    this.state.willPublish
                    ? <Text style={styles.loadingText}>合并视频音频...</Text>
                    : null
                  }
                  {
                    this.state.publishProgress > 0.3
                    ? <Text style={styles.loadingText}>发布视频中...</Text>
                    : null
                  }
                  
                  <Circle
                    showsText={true}
                    size={60}
                    color={'#ee735c'}
                    progress={this.state.publishProgress}/>
                </View>
              : null
            }
            
            <View style={styles.submitBox}>
            {
              this.state.audioUploaded && !this.state.publishing
              ? <Button style={styles.btn} onPress={this._submit}>发布视频</Button>
              : null
            }
              
            </View>
          </View>
        </Modal>
      </View>
    )
  }
}

var styles = StyleSheet.create({
  container: {
    flex: 1
  },

  toolBar: {
    flexDirection: 'row',
    paddingTop: 25,
    paddingBottom: 12,
    backgroundColor: '#ee735c'
  },

  toolBarTitle: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600'
  },

  toolBarChange: {
    position: 'absolute',
    right: 10,
    top: 26,
    color: '#fff',
    textAlign: 'right',
    fontWeight: '600',
    fontSize: 14
  },

  page: {
    flex: 1,
    alignItems: 'center'
  },

  uploadContainer: {
    marginTop: 90,
    width: width - 40,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: '#ee735c',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: '#fff'
  },

  uploadTitle: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 10,
    color: '#000'
  },

  uploadDesc: {
    color: '#999',
    textAlign: 'center',
    fontSize: 12
  },

  uploadIcon: {
    width: 110,
    height: 110 * 1.2,
    marginTop: 10,
    marginBottom: 10,
    resizeMode: 'contain'
  },

  uploadBox: {
    justifyContent: 'center',
    alignItems: 'center'
  },

  videoContainer: {
    width: width,
    justifyContent: 'center',
    alignItems: 'flex-start'
  },

  videoBox: {
    width: width,
    height: height * 0.6
  },

  video: {
    width: width,
    height: height * 0.6 - 30,
    backgroundColor: '#333'
  },

  progressTipBox: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: width,
    height: 30,
    backgroundColor: '#fff'
  },

  progressTip: {
    color: '#999',
    width: width - 10,
    padding: 5
  },

  progressBar: {
    width: width
  },

  recordBox: {
    width: width,
    height:  40,
    alignItems: 'center'
  },

  recordOn: {
    backgroundColor: '#ccc'
  },

  recordIconBox: {
    width: 68,
    height: 68,
    marginTop: -60,
    borderRadius: 34,
    backgroundColor: '#ee735c',
    borderWidth: 1,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },

  recordIcon: {
    fontSize: 58,
    backgroundColor: 'transparent',
    color: '#fff'
  },

  countBtn: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff'
  },

  previewBox: {
    width: 80,
    height: 30,
    position: 'absolute',
    right: 10,
    bottom: 50,
    borderWidth: 1,
    borderColor: '#ee735c',
    borderRadius: 3,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },

  previewIcon: {
    marginRight: 5,
    fontSize: 20,
    color: '#ee735c',
    backgroundColor: 'transparent'
  },

  previewText: {
    fontSize: 20,
    color: '#ee735c',
    backgroundColor: 'transparent'
  },

  uploadAudioBox: {
    width: width,
    height: 60,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },

  uploadAudioText: {
    width: width - 20,
    borderWidth: 1,
    borderColor: '#ee735c',
    padding: 5,
    borderRadius: 5,
    textAlign: 'center',
    fontSize: 30,
    color: '#ee735c'
  },

  fieldBox: {
    width: width - 40,
    height: 36,
    marginTop: 30,
    marginLeft: 20,
    marginRight: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea'
  },

  modalContainer: {
    width: width,
    height: height,
    paddingTop: 50,
    backgroundColor: '#fff'   
  },

  inputField: {
    height: 36,
    textAlign: 'center',
    color: '#666',
    fontSize: 14
  },

  closeIcon: {
    alignSelf: 'center',
    fontSize: 30,
    color: '#ee753c'
  },

  btn: {
    padding: 10,
    marginTop: 55,
    marginLeft: 10,
    marginRight: 10,
    backgroundColor: 'transparent',
    borderColor: '#ee735c',
    borderWidth: 1,
    borderRadius: 4,
    color: '#ee735c'
  },

  loadingBox: {
    width: width,
    height: 50,
    marginTop: 10,
    padding: 15,
    alignItems: 'center'
  },

  loadingText: {
    marginBottom: 10,
    color: '#333'
  },

  submitBox: {
    marginTop: 50,
    padding: 15
  }


});

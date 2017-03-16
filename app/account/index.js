import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Image,
  AsyncStorage,
  AlertIOS,
  Modal,
  TextInput
} from 'react-native';

import { Circle } from 'react-native-progress';
import Icon from 'react-native-vector-icons/Ionicons';
import { showImagePicker } from 'react-native-image-picker';
import Button from 'react-native-button';

import request from '../common/request'
import config from '../common/config'

const width = Dimensions.get('window').width;

const signatureURL = config.api.base + config.api.signature;

function avatar(src,type) {
  // 头像地址是http地址 或者本地的地址
  if(src.indexOf('http') > -1 || src.indexOf('data:image') > -1) {
    return src;
  }

  // 头像地址是cloud 地址
  if(config.cloud === 'qiniu') {
    return config.qiniu.avatar_url + src;
  }
  else {
    return config.cloudinary.base + '/' + type + '/upload/' + src;
  }
}

export default class Account extends Component {
  constructor(props) {
    super(props);
    var user = this.props.user || {};
    this.state={
      user: user,
      avatarProgress: 0,
      avatarUploading: false,
      modalVisible: false
    }

    this._pickPhoto = this._pickPhoto.bind(this);
    this._upload = this._upload.bind(this);
    this._asyncUser = this._asyncUser.bind(this);
    this._edit = this._edit.bind(this);
    this._closeModal = this._closeModal.bind(this);
    this._changeUserState = this._changeUserState.bind(this);
    this._submit = this._submit.bind(this);
    this._logout = this._logout.bind(this);

    this._getQiniuToken = this._getQiniuToken.bind(this);
    this._getCloudinaryToken = this._getCloudinaryToken.bind(this);
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
  }

  _edit() {
    this.setState({
      modalVisible: true
    })
  }

  _closeModal() {
    this.setState({
      modalVisible: false
    })
  }

  _getQiniuToken(response) {
    var _this = this;
    var uri = response.uri;
    var accessToken = this.state.user.accessToken;
    return request.post(signatureURL, {
        accessToken: accessToken,
        type: 'avatar',
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
              type: 'image/jpeg',
              uri: uri,
              name: key
            });

            _this._upload(body)
          }
        })
  }

  _getCloudinaryToken(response) {
    var _this = this;
    var accessToken = this.state.user.accessToken;
    var timestamp = Date.now();
    var tags = 'app,avatar';
    var folder = 'avatar';
    var avatarData = 'data:image/jpeg;base64,' + response.data;

    return request.post(signatureURL, {
        accessToken: accessToken,
        timestamp: timestamp,
        type: 'avatar'
      })
      .catch((err) => {
        console.log(err)
      })
      .then((data) => {
        if(data && data.success) {
          var token = data.data.token;
          var body = new FormData();

          body.append('folder', folder);
          body.append('signature', token);
          body.append('tags', tags);
          body.append('api_key', config.cloudinary.api_key);
          body.append('resource_type', 'image');
          body.append('file', avatarData);
          body.append('timestamp', timestamp);

          _this._upload(body)
        }
      })
  }

  _pickPhoto() {
    var _this = this;
    showImagePicker(config.photoOptions, (response) => {

      if (response.didCancel) {
        return;
      }
      
      if(config.cloud === 'qiniu') {
        // 七牛 服务
        _this._getQiniuToken(response);
      } else {
        // cloudinary 服务
        _this._getCloudinaryToken(response)
      }

    });
  }

  _asyncUser(isAvatar) {
    var _this = this;
    var user = this.state.user;
    if(user && user.accessToken) {
      var url = config.api.base + config.api.update;

      request.post(url, user)
        .then((data) => {
          if(data && data.success) {
            var user = data.data;
            if(isAvatar) {
              AlertIOS.alert('头像更新成功')
            }
            _this.setState({
              user: user
            },function() {
              AsyncStorage.setItem('user', JSON.stringify(user))
            })
          }
        })
    }

  }

  _upload(body) {
    var _this = this;
    var xhr = new XMLHttpRequest();
    var url;

    if(config.cloud === 'qiniu') {
      url = config.qiniu.upload;
    } else {
      url = config.cloudinary.image;
    }

    _this.setState({
      avatarUploading: true,
      avatarProgress: 0
    })

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

      if(response) {
        var user  = this.state.user;

        if(response.public_id) {
          user.avatar = response.public_id;
        }
        if(response.key) {
          user.avatar = response.key;
        }

        _this.setState({
            avatarUploading: false,
            avatarProgress: 0,
            user: user
          })

        _this._asyncUser(true);
      } 
    }

    if(xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if(event.lengthComputable) {
          var percent = Number((event.loaded / event.total).toFixed(2));
          _this.setState({
            avatarProgress: percent
          })
        }
      }
    }
    xhr.send(body);
  }

  _changeUserState(key, value) {
    var user = this.state.user;
    user[key] = value;
    this.setState({
      user: user
    })
  }

  _submit() {
    this._asyncUser();
    this._closeModal();
  }

  _logout() {
    this.props.logout();
  }

  render() {
    var user = this.state.user;
    return (
      <View style={styles.container}>
        <View style={styles.toolBar}>
          <Text style={styles.toolBarTitle}>我的账户</Text>
          <Text style={styles.toolBarEdit} onPress={this._edit}>编辑</Text>
        </View>

        {
          user.avatar
          ? <TouchableOpacity onPress={this._pickPhoto} style={styles.avatarContainer}>
              <Image source={{uri: avatar(user.avatar,'image')}} style={styles.avatarContainer}>
                  <View style={styles.avatarBox}>
                    {
                      this.state.avatarUploading
                      ? <Circle
                        showsText={true}
                        size={75}
                        color={'#ee735c'}
                        progress={this.state.avatarProgress}/>
                      : <Image 
                          source={{uri: avatar(user.avatar,'image')}}
                          style={styles.avatar}
                        />
                    }
                  </View>
              </Image>
            </TouchableOpacity>
          : <View style={styles.avatarContainer}>
              <TouchableOpacity style={styles.avatarBox} onPress={this._pickPhoto}>
                {
                  this.state.avatarUploading
                  ? <Circle
                    showsText={true}
                    size={75}
                    color={'#ee735c'}
                    progress={this.state.avatarProgress}/>
                  : <Icon name='ios-cloud-upload-outline' style={styles.plusIcon}/>
                }
              </TouchableOpacity>
            </View>
        }

          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <Text style={styles.label}>昵称</Text>
              <Text style={styles.infoField}>{user.nickName}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>品种</Text>
              <Text style={styles.infoField}>{user.breed}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>年龄</Text>
              <Text style={styles.infoField}>{user.age}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>性别</Text>
              {
                user.gender == 'male'
                ? <Icon size={16} name='ios-paw'>男</Icon>
                : <Icon size={16} name='ios-paw-outline'>女</Icon>
              }
            </View>

            <Button style={styles.btn} onPress={this._logout}>退出登录</Button>
          </View>

         <Modal
          animate={true}
          animationType={'slide'}
          visible={this.state.modalVisible}
          >
          <View style={styles.modalContainer}>
            <Icon name='ios-close-outline' style={styles.closeIcon} onPress={this._closeModal}/>
            <View style={styles.fieldItem}>
              <Text style={styles.label}>昵称</Text>
              <TextInput 
                placeholder={'输入昵称'}
                style={styles.inputField}
                autoCapitalize={'none'}
                autoCorrect={false}
                defaultValue={user.nickName}
                onChangeText={(text) => {
                          this._changeUserState('nickName', text)
                        }}
                />
            </View>
            <View style={styles.fieldItem}>
              <Text style={styles.label}>品种</Text>
              <TextInput 
                placeholder={'输入品种'}
                style={styles.inputField}
                autoCapitalize={'none'}
                autoCorrect={false}
                defaultValue={user.breed}
                onChangeText={(breed) => {
                          this._changeUserState('breed', breed)
                        }}
                />
            </View>
            <View style={styles.fieldItem}>
              <Text style={styles.label}>年龄</Text>
              <TextInput 
                placeholder={'输入年龄'}
                style={styles.inputField}
                autoCapitalize={'none'}
                autoCorrect={false}
                defaultValue={user.age}
                onChangeText={(age) => {
                          this._changeUserState('age', age)
                        }}
                />
            </View>
            <View style={styles.fieldItem}>
              <Text style={styles.label}>性别</Text>
              <Icon.Button
              name='ios-paw'
              style={[styles.gender,user.gender == 'male' && styles.genderChecked]} 
              onPress={(gender) => {
                          this._changeUserState('gender', 'male')
                        }}>
              男
            </Icon.Button>
            <Icon.Button
              name='ios-paw-outline'
              style={[styles.gender,user.gender == 'female' && styles.genderChecked]} 
              onPress={(gender) => {
                          this._changeUserState('gender', 'female')
                        }}>
              女
            </Icon.Button>
            </View>
            <Button style={styles.btn} onPress={this._submit}>保存</Button>
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

  toolBarEdit: {
    position: 'absolute',
    right: 10,
    top: 26,
    color: '#fff',
    textAlign: 'right',
    fontWeight: '600',
    fontSize: 14
  },

  avatarContainer: {
    width: width,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#666'
  },

  avatarBox: {
    alignItems: 'center',
    justifyContent: 'center'
  },

  avatarTip: {
    marginTop: 15,
    color: '#fff',
    backgroundColor: 'transparent',
    fontSize: 14
  },

  avatar: {
    width: width * 0.2,
    height: width * 0.2,
    resizeMode: 'cover',
    borderRadius: width * 0.1
  },

  plusIcon: {
    padding: 20,
    paddingLeft: 25,
    paddingRight: 25,
    backgroundColor: '#fff',
    borderRadius: 12,
    color: '#666',
    fontSize: 24,
    overflow: 'hidden'
  },

  infoContainer: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#fff'   
  },

  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
    paddingLeft: 15,
    paddingRight: 15,
    borderColor: '#eee',
    borderBottomWidth: 1
  },

  modalContainer: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#fff'   
  },

  fieldItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
    paddingLeft: 15,
    paddingRight: 15,
    borderColor: '#eee',
    borderBottomWidth: 1
  },

  label: {
    color: '#999',
    marginRight: 10
  },

  inputField: {
    height: 50,
    flex: 1,
    color: '#333',
    fontSize: 14
  },

  closeIcon: {
    alignSelf: 'center',
    fontSize: 30,
    color: '#ee753c'
  },

  gender: {
    backgroundColor: '#aaa'
  },

  genderChecked: {
    backgroundColor: '#ee735c'
  },

  btn: {
    padding: 10,
    marginTop: 25,
    marginLeft: 10,
    marginRight: 10,
    backgroundColor: 'transparent',
    borderColor: '#ee735c',
    borderWidth: 1,
    borderRadius: 4,
    color: '#ee735c'
  },

});

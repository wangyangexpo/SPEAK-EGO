import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  ListView,
  TextInput,
  Modal,
  AlertIOS,
  ProgressViewIOS,
  AsyncStorage
} from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';
import Button from 'react-native-button';
import Video from 'react-native-video';

import request from '../common/request'
import config from '../common/config'

const width = Dimensions.get('window').width;

function avatar(src,type) {
  // 头像地址是http地址 或者本地的地址
  if(src && (src.indexOf('http') > -1 || src.indexOf('data:image')) > -1) {
    return src;
  }

  // 头像地址是cloud 地址
  if(config.cloud === 'qiniu') {
    return config.qiniu.store_url + src;
  }
  else {
    return config.cloudinary.base + '/' + type + '/upload/' + src;
  }
}

var cacheResult = {
  nextPage: 1,
  items: [],
  total: 0
}

export default class Detail extends Component {
  constructor(props) {
    super(props);
    var ds = new ListView.DataSource({
      rowHasChanged: (r1,r2) => r1 !== r2
    })
    this.state = {
      user: {},

      // modal
      modalVisible: false,
      animationType: 'none',
      content: '',
      isSending: false,

      dataSource: ds.cloneWithRows([]),
      isLoadingTail: false,
      playing: false,

      rate: 1,
      muted: false,
      resizeMode: 'contain',
      repeat: false,
      paused: false,
      videoOk: true,

      videoLoaded: false,
      videoProgress: 0,
      videoTotal: 0,
      currentTime: 0
      
    }
    this._backToList = this._backToList.bind(this);
    this._onProgress = this._onProgress.bind(this);
    this._onEnd = this._onEnd.bind(this);
    this._rePlay = this._rePlay.bind(this);
    this._pauseOrResume = this._pauseOrResume.bind(this);
    this._onError = this._onError.bind(this);

    this._fetchCommentData = this._fetchCommentData.bind(this);
    this._fetchMoreComment = this._fetchMoreComment.bind(this);
    this._renderFooter = this._renderFooter.bind(this);

    this._renderHeader = this._renderHeader.bind(this);

    this._setModalVisible = this._setModalVisible.bind(this);
    this._focus = this._focus.bind(this);
    this._closeModal = this._closeModal.bind(this);
    this._submitComment = this._submitComment.bind(this);
  }

  _backToList() {
    this.props.navigator.pop();
  }

  _onLoadStart() {
    //console.log('start')
  }

  _onLoad() {
    //console.log('loading')
  }

  _onProgress(data) {
    if(!this.state.videoLoaded) {
      this.setState({
        videoLoaded: true
      })
    }
    var duration = data.seekableDuration;
    var currentTime = data.currentTime;
    var percent = Number((currentTime / duration).toFixed(2));

    var newState = {
        videoTotal: duration,
        currentTime: Number(currentTime.toFixed(2)),
        videoProgress: percent
    }

    if(!this.state.videoLoaded) {
      newState.videoLoaded = true,
      newState.playing = true
    }

    this.setState(newState);

  }

  _onEnd() {
    this.setState({
      videoProgress: 1,
      playing: false
    })
  }

  _onError(err) {
    this.setState({
      videoOk: false
    })
    //console.log('error');
    //console.log(err)
  }

  _rePlay() {
    this.refs.videoPlay.seek(0);
    this.setState({
      playing: true
    })
  }

  _pauseOrResume() {
    this.setState(prevState => ({
        paused: !prevState.paused
    }))
  }

  componentDidMount() {
    var _this = this;
    cacheResult = {
      nextPage: 1,
      items: [],
      total: 0
    }
    AsyncStorage.getItem('user')
      .then((data) => {
        var user = JSON.parse(data);
        if(user && user.accessToken) {
          _this.setState({
            user:user
          })
          _this._fetchCommentData(1);
        } else {
          _this.props.logout();
        }
      })
  }

  _renderRow(row) {

    return (<View key={row._id} style={styles.replyBox}>
              <Image style={styles.replyAvatar} source={{uri: row.replyBy.avatar}}/>
              <View style={styles.reply}>
                  <Text style={styles.replyNickName}>{row.replyBy.nickName}</Text>
                  <Text style={styles.replyContent}>{row.content}</Text>
              </View>
            </View>)
  }

  _fetchCommentData(page) {
    var _this= this;
    var creation = this.props.data;
    var accessToken = this.state.user.accessToken;

    this.setState({
      isLoadingTail: true
    })

    request.get(config.api.base + config.api.comment,
      {
        creationId: creation._id,
        accessToken:accessToken,
        page: page
      })
      .then((data) => {

        if(data.success) {
          let items = cacheResult.items.slice();

          cacheResult.nextPage += 1;
          items = items.concat(data.data);
          
          cacheResult.items = items;
          cacheResult.total = data.total;

          _this.setState({
              isLoadingTail: false,
              dataSource: _this.state.dataSource.cloneWithRows(items)
            })
          
        }
      })
      .catch((error) => {
        this.setState({
            isLoadingTail: false
        })
        console.warn(error);
      });
  }

  _hasMore() {
    return cacheResult.items.length < cacheResult.total;
  }

  _fetchMoreComment() {
      if(!this._hasMore() || this.state.isLoadingTail) {
        return
      }

      let page = cacheResult.nextPage;

      this._fetchCommentData(page);
  }

  // commentsList Footer
  _renderFooter() {
    if(!this._hasMore() && cacheResult.total != 0) {
      return (
          <View style={styles.loadingMore}>
            <Text style={styles.loadingText}>没有更多了</Text>
          </View>
      )
    }

    if(!this.state.isLoadingTail) {
      return <View style={styles.loadingMore}/>
    }

    return (<ActivityIndicator style={styles.loadingMore}/>)
    
  }

  // commentsList Header
  _renderHeader() {
    var data = this.props.data; 
    return (
      <View style={styles.listHeader}>
        <View style={styles.infoBox}>
          <Image style={styles.avatar} source={{uri: avatar(this.state.user.avatar, 'image')}}/>
          <View style={styles.descBox}>
              <Text style={styles.nickName}>{data.author.nickName}</Text>
              <Text style={styles.title}>{data.title}</Text>
          </View>
        </View>
        <View style={styles.commentBox}>
            <View style={styles.comment}>
                <TextInput
                  placeholder='请在这里输入你的评论...'
                  style={styles.content}
                  multiline={true}
                  onFocus={this._focus}
                />
            </View>
        </View>

        <View style={styles.commentArea}>
            <Text style={styles.commentTitle}>精彩评论</Text>
        </View>
      </View>
    )
  }

  _focus() {
    this._setModalVisible(true);
  }

  _setModalVisible(isVisible) {
    this.setState({
      modalVisible: isVisible
    })
  }

  _closeModal() {
    this._setModalVisible(false)
  }

  _submitComment() {
    var _this = this;
    if(!this.state.content) {
      return AlertIOS.alert('评论不能为空')
    }

    if(this.state.isSending) {
      return AlertIOS.alert('正在评论中')
    }

    this.setState({
      isSending: true
    },function() {
      var body = {
        accessToken: 'abc',
        creation: 123,
        content: this.state.content
      }
      var url = config.api.base + config.api.comment;
      request.post(url, body)
        .then((data) => {
            if(data && data.success) {
                var items = cacheResult.items.slice();
                items = [{
                    content: _this.state.content,
                    replyBy: {
                      nickName: 'gougousay',
                      avatar: 'http://dummyimage.com/\"640x640\"/9afea2)'
                    }
                }].concat(items);

                cacheResult.items = items;
                cacheResult.total += 1;
                this.setState({
                  content: '',
                  isSending: false,
                  dataSource: _this.state.dataSource.cloneWithRows(items)
                })

                _this._setModalVisible(false);
            }
        })
        .catch((err) => {
          console.log(err);
          this.setState({
            isSending: false
          })
          _this._setModalVisible(false);
          AlertIOS.alert('留言失败，请稍后重试')
        })
    })
  }

  render() {
    var data = this.props.data;
    return (
      <View style={[styles.container]}>
        <View style={styles.header}>
            <TouchableOpacity style={styles.backBox} onPress={this._backToList}>
                <Icon name='ios-arrow-back' style={styles.backIcon}/>
                <Text style={styles.backText}>返回</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOflines={1}>视频详情页</Text>
        </View>
        <View style={styles.videoBox}>
          <Video 
            ref='videoPlay'
            source={{uri: config.qiniu.list_url + data.video}}
            style={styles.video}
            volume={4}
            paused={this.state.paused}
            rate={this.state.rate}
            muted={this.state.muted}
            resizeMode={this.state.resizeMode}
            repeat={this.state.repeat}

            onLoadStart={this._onLoadStart}
            onLoad={this._onLoad}
            onProgress={this._onProgress}
            onEnd={this._onEnd}
            onError={this._onError}
            />
            {
              !this.state.videoOk && <Text style={styles.failText} >视频出错了！</Text>
            }

            {
              !this.state.videoLoaded && <ActivityIndicator color='#ee735c' style={styles.loading} />
            }
            
            {
              this.state.videoLoaded && !this.state.playing
              ? <Icon
                  onPress={this._rePlay}
                  name='ios-refresh'
                  size={48}
                  style={styles.playIcon} />
              : null
            }

            {
              this.state.videoLoaded && this.state.playing
              ? <TouchableOpacity onPress={this._pauseOrResume} style={styles.pauseBtn}>
                  {
                    this.state.paused
                    ? <Icon size={48} name='ios-play' style={styles.resumeIcon}/>
                    : <Text></Text>
                  }
                </TouchableOpacity>
              : null
            }

            <ProgressViewIOS progress={this.state.videoProgress} progressTintColor='#ee735c'/>
        </View>
        
        <ListView
          dataSource={this.state.dataSource}
          renderRow={this._renderRow}

          renderHeader={this._renderHeader}
          renderFooter={this._renderFooter}
          onEndReached={this._fetchMoreComment}
          onEndReachedThreshold={20}

          enableEmptySections={true}
          automaticallyAdjustContentInsets={false}
          showsVerticalScrollIndicator={false}
          />

        <Modal
          animationType={'slide'}
          visible={this.state.modalVisible}
          >
          <View style={styles.modalContainer}>
            <Icon onPress={this._closeModal} name='ios-close-outline' style={styles.closeIcon}/>
            <View style={styles.commentBox}>
                <View style={styles.comment}>
                    <TextInput
                      placeholder='请在这里输入你的评论...'
                      style={styles.content}
                      multiline={true}
                      defaultValue={this.state.content}
                      onChangeText={(text) => {
                        this.setState({
                          content: text
                        })
                      }}
                    />
                </View>
            </View>
            <Button style={styles.submitBtn} onPress={this._submitComment}>
              评论
            </Button>
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

  modalContainer: {
    flex: 1,
    paddingTop: 45,
    backgroundColor: '#fff'
  },

  closeIcon: {
    alignSelf: 'center',
    fontSize: 30,
    color: '#ee753c'
  },

  submitBtn: {
    alignSelf: 'center',
    width: width - 20,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ee735c',
    borderRadius: 4,
    color: '#ee735c',
    fontSize: 18
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: width,
    height: 64,
    paddingTop: 20,
    paddingLeft: 10,
    paddingRight: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#fff'
  },

  backBox: {
    position: 'absolute',
    left: 12,
    top: 32,
    width: 50,
    flexDirection: 'row',
    alignItems: 'center'
  },

  headerTitle: {
    width: width - 120,
    textAlign: 'center'
  },

  backIcon: {
    position: 'relative',
    top: 1,
    color: '#999',
    fontSize: 20,
    marginRight: 5
  },

  backText: {
    color: '#999'
  },

  tabText: {
    color: 'black'
  },

  videoBox: {
    width: width,
    height: width * 0.56
  },
  video: {
    width: width,
    height: width * 0.56
  },
  loading: {
    position: 'absolute',
    left: 0,
    top: 95,
    width: width,
    alignSelf: 'center',
    backgroundColor: 'transparent'
  },

  failText: {
    color: '#fff',
    position: 'absolute',
    left: 10,
    top: 90,
    width: width,
    textAlign: 'center',
    backgroundColor: 'transparent'
  },

  playIcon: {
    position: 'absolute',
    top: 80,
    left: width / 2 - 25,
    width: 60,
    height: 60,
    paddingTop: 6,
    paddingLeft: 18,
    backgroundColor: 'transparent',
    borderColor: '#fff',
    borderWidth: 1,
    borderRadius: 30,
    color: '#ed7b66'
  },

  pauseBtn: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: width,
    height: width * 0.56
  },
  resumeIcon: {
    position: 'absolute',
    top: 80,
    left: width / 2 - 25,
    width: 60,
    height: 60,
    paddingTop: 6,
    paddingLeft: 22,
    backgroundColor: 'transparent',
    borderColor: '#fff',
    borderWidth: 1,
    borderRadius: 30,
    color: '#ed7b66'
  },

  infoBox: {
    width: width,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10
  },

  avatar: {
    width: 60,
    height: 60,
    marginLeft: 10,
    marginRight: 10,
    borderRadius: 30
  },

  descBox: {
    flex: 1
  },

  nickName: {
    fontSize: 18
  },

  title: {
    marginTop: 8,
    fontSize: 16,
    color: '#666'
  },

  replyBox: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 10
  },

  replyAvatar: {
    width: 40,
    height: 40,
    marginRight: 10,
    marginLeft: 10,
    borderRadius: 20
  },

  replyNickName: {
    color: '#666'   
  },

  replyContent: {
    color: '#666',
    marginTop: 4
  },

  reply: {
    flex: 1
  },

  loadingMore: {
    marginVertical: 20
  },

  loadingText: {
    color: '#777',
    textAlign: 'center'
  },

  commentBox: {
    marginTop: 10,
    marginBottom: 10,
    padding: 8,
    width: width
  },

  content: {
    paddingLeft: 2,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    fontSize: 14,
    height: 80
  },

  listHeader: {
    marginTop: 10,
    width: width
  },

  commentArea: {
    width: width,
    paddingBottom: 6,
    paddingLeft: 15,
    paddingRight: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  }

});

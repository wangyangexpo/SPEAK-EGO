import React, { Component } from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  StyleSheet,
  Text,
  View,
  ListView,
  TouchableHighlight,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  AlertIOS,
  AsyncStorage
} from 'react-native';

import request from '../common/request'
import config from '../common/config'
import Detail from './detail'

const width = Dimensions.get('window').width;

let cacheResult = {
  nextPage: 1,
  items: [],
  total: 0
}

class Item extends Component {
  constructor(props) {
    super(props);
    var row = this.props.row
    this.state = {
      row: row,
      up: row.voted
    }
    this._up = this._up.bind(this);
  }

  _up() {
    var _this = this;
    var up = !this.state.up;
    var row = this.state.row;
    var url = config.api.base + config.api.up;

    var body = {
      id: row._id,
      up: up ? 'yes' : 'no',
      accessToken: 'abcde'
    }

    request.post(url, body)
      .then((data) => {
        if(data && data.success) {
          _this.setState({
            up: up
          })
        }else {
          AlertIOS.alert('点赞失败，稍后请重试')
        }
      })
      .catch((err) => {
        console.log(err);
        AlertIOS.alert('点赞失败，稍后请重试')
      })
  }

  render() {
    var row = this.state.row;
    return (
      <TouchableHighlight onPress={this.props.onSelect}>
          <View style={styles.item}>
            <Text style={styles.title}>{row.title}</Text>
            <Image
              source={{uri: config.qiniu.list_url + row.thumb}}
              style={styles.thumb}>
            <Icon name='ios-play' size={28} style={styles.play}/>
            </Image>
            <View style={styles.itemFooter}>
                <View style={styles.handleBox}>
                  <Icon onPress={this._up}
                  name={this.state.up ? 'ios-heart' : 'ios-heart-outline'}
                  size={28} 
                  style={[styles.up, this.state.up ? null : styles.down]}/>
                  <Text style={styles.handleText} onPress={this._up}>喜欢</Text>
                </View>
                 <View style={styles.handleBox}>
                  <Icon name='ios-chatboxes-outline' size={28} style={styles.commentIcon}/>
                  <Text style={styles.handleText}>评论</Text>
                </View>
            </View>
          </View>
        </TouchableHighlight>
      )
  }
}

export default class List extends Component {
  constructor(props){
    super(props);
    var ds = new ListView.DataSource({
      rowHasChanged: (r1,r2) => r1 !== r2
    })

    this.state={
      user: null,
      dataSource: ds.cloneWithRows([]),
      isLoadingTail: false,
      isRefreshing: false
    }

    this._fetchMoreData = this._fetchMoreData.bind(this);
    this._renderFooter = this._renderFooter.bind(this);
    this._onRefresh = this._onRefresh.bind(this);
    this._loadPage = this._loadPage.bind(this);
    this._renderRow = this._renderRow.bind(this);
  }

  componentDidMount() {
    var _this = this;
    // 这里设置初始的 total > 0 是为了触发 onreachended 方法的第一次加载
    // 因为list页面 进入就会 默认触发一次 onreachended
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
          _this._fetchData(1);
        } else {
          _this.props.logout();
        }
      })
    
  }

  _fetchData(page) {
    var _this= this;

    if(page != 0){
      this.setState({
        isLoadingTail: true
      })
    }else {
      this.setState({
        isRefreshing: true
      })
    }
    
    var accessToken = this.state.user.accessToken;
    var items = cacheResult.items.slice();
    var s_id,e_id;
    if(items.length > 0) {
      console.log(items);
      s_id = items[0]._id;
      e_id = items[items.length - 1]._id;
    } 
    request.get(config.api.base + config.api.creations,
      {
        accessToken: accessToken,
        page: page,
        startId: s_id,
        endId: e_id
      })
      .then((data) => {

        console.log(data);

        if(data.success) {
          

          if(page !== 0) {
              cacheResult.nextPage += 1;
              items = items.concat(data.data);
          }else {
              items = data.data.concat(items);
          }
          
          cacheResult.items = items;
          cacheResult.total = data.total;

          _this.setState({
              isLoadingTail: false,
              isRefreshing: false,
              dataSource: _this.state.dataSource.cloneWithRows(items)
            })
          
        }
      })
      .catch((error) => {
        this.setState({
            isLoadingTail: false,
            isRefreshing: false
        })
        console.warn(error);
      });
  }

  _renderRow(row) {
    return <Item
    key={row._id}
    onSelect={() => this._loadPage(row)}
    row={row} />
  }

  _hasMore() {
    return cacheResult.items.length < cacheResult.total;
  }

  _fetchMoreData() {
      // onreachended方法在set datasource的时候如果 数目较少，会自动触发一次

      if(!this._hasMore() || this.state.isLoadingTail) {
        return
      }

      let page = cacheResult.nextPage;
      this._fetchData(page);
  }

  _renderFooter() {
    if(!this._hasMore() && cacheResult.total != 0) {
      return (
          <View style={styles.loadingMore}>
            <Text style={styles.loadingText}>没有更多了</Text>
          </View>
      )
    }

    if(cacheResult.total === 0) {
      return (
          <View style={styles.loadingMore}>
            <Text style={styles.loadingText}>还没有新鲜事...</Text>
          </View>
      )
    }

    if(!this.state.isLoadingTail) {
      return <View style={styles.loadingMore}/>
    }

    return (<ActivityIndicator style={styles.loadingMore}/>)
    
  }

  _onRefresh() {
      if(this.state.isRefreshing) {
        return
      }

      this._fetchData(0);
  }

  _loadPage(row) {
    this.props.navigator.push({
      name: 'detail',
      component: Detail,
      params: {
        data: row
      }
    })
  }

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.headerTitle}>列表页面</Text>
        </View>
        <ListView
          dataSource={this.state.dataSource}
          renderRow={this._renderRow}
          renderFooter={this._renderFooter}
          onEndReached={this._fetchMoreData}
          refreshControl={
            <RefreshControl
              refreshing={this.state.isRefreshing}
              onRefresh={this._onRefresh}
              tintColor='#ff6600'
              title='拼命加载中...'
            />
          }
          onEndReachedThreshold={20}
          enableEmptySections={true}
          automaticallyAdjustContentInsets={false}
          showsVerticalScrollIndicator={false}
          />
      </View>
    )
  }
}

var styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF'
  },

  header: {
    paddingTop: 25,
    paddingBottom: 12,
    backgroundColor: '#ee735c'
  },

  headerTitle: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600'
  },

  item: {
    width: width,
    marginBottom: 10,
    backgroundColor: '#fff'
  },

  thumb: {
    width: width,
    height: width * 0.56,
    resizeMode: 'cover'
  },

  title: {
    padding: 10,
    fontSize: 18,
    color: '#333'
  },

  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#eee'
  },

  handleBox: {
    padding: 10,
    flexDirection: 'row',
    width: width / 2 - 0.5,
    justifyContent: 'center',
    backgroundColor: '#fff'
  },

  play: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 46,
    height: 46,
    paddingTop: 9,
    paddingLeft: 18,
    backgroundColor: 'transparent',
    borderColor: '#fff',
    borderWidth: 1,
    borderRadius: 23,
    color: '#ed7b66'
  },

  handleText: {
    paddingLeft: 12,
    fontSize: 18,
    color: '#333'
  },

  down: {
    fontSize: 22,
    color: '#333'
  },

  up: {
    fontSize: 22,
    color: '#ed7b66'
  },

  commentIcon: {
    fontSize: 22,
    color: '#333'
  },

  loadingMore: {
    marginVertical: 20
  },

  loadingText: {
    color: '#777',
    textAlign: 'center'
  }
});

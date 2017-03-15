/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import List from './app/creation/index';
import Edit from './app/edit/index';
import Account from './app/account/index';
import Login from './app/account/login'
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  TabBarIOS,
  Navigator,
  AsyncStorage
} from 'react-native';



export default class imoocApp extends Component {
  constructor(props){
    super(props);
    this.state = {
      selectedTab: 'edit',
      isLogin: false
    }

    this._asyncAppStatus = this._asyncAppStatus.bind(this);
    this._afterLogin = this._afterLogin.bind(this);
    this._logout = this._logout.bind(this);
  }

  _asyncAppStatus() {
    var _this = this;
    AsyncStorage.getItem('user')
      .then((data) => {
        var user = null;
        var newState = {};

        if(data) {
          user = JSON.parse(data)
        }

        if(user && user.accessToken) {
          newState.user = user;
          newState.isLogin = true
        }else {
          newState.isLogin = false
        }

        _this.setState(newState)
      })
  }

  componentDidMount() {
    this._asyncAppStatus()
  }

  _afterLogin(user) {
    var _this = this;
    console.log(user);
    AsyncStorage.setItem('user', JSON.stringify(user))
      .then((data) => {
        _this.setState({
          user: user,
          isLogin: true
        })
      })
  }

  _logout() {
    AsyncStorage.removeItem('user');
    this.setState({
      isLogin: false,
      user: null
    })
  }

  render() {
    if(!this.state.isLogin) {
      return <Login afterLogin={this._afterLogin}/> 
    }
    return (
      <TabBarIOS tintColor="#ee735c">
        <Icon.TabBarItem
          iconName="ios-videocam-outline"
          selectedIconName="ios-videocam"
          selected={this.state.selectedTab === 'list'}
          onPress={() => {
            this.setState({
              selectedTab: 'list',
            });
          }}>
          <Navigator 
            logout={this._logout}
            initialRoute={{
              name: 'list',
              component: List
            }}
            configureScene={(route) => {
                return Navigator.SceneConfigs.FloatFromRight
            }}
            renderScene={(route, navigator) => {
              var Component = route.component
              return <Component {...route.params} navigator={navigator} />
            }}
            />
        </Icon.TabBarItem>
        <Icon.TabBarItem
          iconName="ios-recording-outline"
          selectedIconName="ios-recording"
          selected={this.state.selectedTab === 'edit'}
          onPress={() => {
            this.setState({
              selectedTab: 'edit'
            });
          }}>
          <Edit />
        </Icon.TabBarItem>
        <Icon.TabBarItem
          iconName="ios-more-outline"
          selectedIconName="ios-more"
          selected={this.state.selectedTab === 'account'}
          onPress={() => {
            this.setState({
              selectedTab: 'account'
            });
          }}>
          <Account user={this.state.user} logout={this._logout}/>
        </Icon.TabBarItem>
      </TabBarIOS>
    );
  }
}

AppRegistry.registerComponent('imoocApp', () => imoocApp);
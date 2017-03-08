import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  AlertIOS
} from 'react-native';

import Button from 'react-native-button';
import request from '../common/request';
import config from '../common/config';

import { CountDownText } from 'react-native-sk-countdown';

export default class Login extends Component {
  constructor(props) {
      super(props);
      this.state={
        codeSent: false,
        phoneNumber: '',
        verifyCode: '',
        countingDone: false
      }

      this._sendVerifyCode = this._sendVerifyCode.bind(this);
      this._showVerifyCode = this._showVerifyCode.bind(this);
      this._countingDone = this._countingDone.bind(this);
      this._submit = this._submit.bind(this);
  }

  _showVerifyCode() {
      this.setState({
        codeSent: true,
        countingDone: false
      })
  }

  _sendVerifyCode() {
      var _this = this;
      var phoneNumber = this.state.phoneNumber;
      if(!phoneNumber) {
        AlertIOS.alert('手机号不能为空');
        return;
      }
      var body = {
        phoneNumber: phoneNumber
      }

      var siginupUrl = config.api.base + config.api.signup;
      request.post(siginupUrl, body)
          .then((data) => {
              if(data && data.success) {
                  _this._showVerifyCode()
              }else {
                  AlertIOS.alert('获取验证码失败，请检查手机号是否正确')
              }
          })
          .catch((err) => {
              AlertIOS.alert('获取验证码失败，请检查网络是否通畅')
          })
  }

  _countingDone() {
      this.setState({
        countingDone: true
      })
  }

  _submit() {
      var _this = this;
      var phoneNumber = this.state.phoneNumber;
      var verifyCode = this.state.verifyCode;
      if(!phoneNumber || !verifyCode) {
        AlertIOS.alert('手机号和验证码不能为空');
        return;
      }
      var body = {
        phoneNumber: phoneNumber,
        verifyCode: verifyCode
      }

      var siginupUrl = config.api.base + config.api.verify;
      request.post(siginupUrl, body)
          .then((data) => {
              if(data && data.success) {
                  _this.props.afterLogin(data.data);
              }else {
                  AlertIOS.alert('获取验证码失败，请检查手机号是否正确')
              }
          })
          .catch((err) => {
              AlertIOS.alert('获取验证码失败，请检查网络是否通畅')
          })
  }

  render() {
    return (
      <View style={styles.container}>
          <View style={styles.signupBox}>
              <Text style={styles.title}>快速登录</Text>
              <View style={styles.phoneNumber}>
                <TextInput 
                    placeholder={'输入手机号'}
                    autoCapitalize={'none'}
                    autoCorrect={false}
                    keyboardType={'number-pad'}
                    style={styles.inputField}
                    onChangeText={(text) => {
                        this.setState({
                          phoneNumber: text
                        })
                    }}
                />
              </View>

              {
                  this.state.codeSent
                  ? <View style={styles.verifyCodeBox}>
                        <TextInput 
                            placeholder={'输入验证码'}
                            autoCapitalize={'none'}
                            autoCorrect={false}
                            keyboardType={'number-pad'}
                            style={styles.inputField}
                            onChangeText={(text) => {
                                this.setState({
                                  verifyCode: text
                                })
                            }}
                        />
                        {
                            this.state.countingDone
                            ? <Button style={styles.countBtn} onPress={this._sendVerifyCode}>获取验证码</Button>
                            : <CountDownText style={styles.countBtn}
                                  countType='seconds'
                                  auto={true}
                                  afterEnd={this._countingDone}
                                  timeLeft={60}
                                  step={-1}
                                  startText='获取验证码'
                                  endText='获取验证码'
                                  intervalText={(sec) => sec + '秒重新获取'}
                              />
                        }
                    </View>
                  : null
              }

              {
                  this.state.codeSent
                  ? <Button style={styles.btn} onPress={this._submit}>登录</Button>
                  : <Button style={styles.btn} onPress={this._sendVerifyCode}>获取验证码</Button>
              }
          </View>
      </View>
    )
  }
}

var styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: '#f9f9f9'
  },

  signupBox: {
    marginTop: 30
  },

  title: {
    marginBottom: 20,
    color: '#333',
    fontSize: 20,
    textAlign: 'center'
  },

  inputField: {
    flex: 1,
    height: 40,
    padding: 5,
    color: '#666',
    fontSize: 16,
    backgroundColor: '#fff',
    borderRadius: 4
  },

  phoneNumber: {
    height: 40
  },

  btn: {
    padding: 10,
    marginTop: 10,
    backgroundColor: 'transparent',
    borderColor: '#ee735c',
    borderWidth: 1,
    borderRadius: 4,
    color: '#ee735c'
  },

  verifyCodeBox: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },

  countBtn: {
    width: 120,
    height: 40,
    padding: 10,
    marginLeft: 8,
    backgroundColor: 'transparent',
    borderColor: '#ee735c',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: 15,
    borderRadius: 2
  }

});
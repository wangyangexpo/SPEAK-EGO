import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View
} from 'react-native';

export default class Account extends Component {
  render() {
    return (
      <View style={[styles.tabContent]}>
        <Text style={styles.tabText}>Account page</Text>
      </View>
    )
  }
}

var styles = StyleSheet.create({
  tabContent: {
    flex: 1,
    alignItems: 'center',
  },
  tabText: {
    color: 'black',
    margin: 50,
  },
});

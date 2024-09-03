import {StyleSheet} from 'react-native';
import {fonts} from '../../assets';
import {height, width} from '../../units';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    backgroundColor: '#fff',
  },
  errorContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  totalUsage: {
    color: 'black',
    fontSize: 16,
    fontFamily: fonts.notosansBold,
  },
  itemContainer: {
    flex: 1,
    flexDirection: 'row',
    // justifyContent: 'space-between',

    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  appIcon: {
    width: 40,
    height: 40,
    marginRight: 16,
  },
  appName: {
    fontSize: 15,
    color: 'black',
    fontFamily: fonts.notosansSemiBold,
  },
  appNameContainer: {
    flex: 1, // Take up the remaining space between app icon and app time
  },
  appTime: {
    fontSize: 13,
    color: '#555',
    alignSelf: 'flex-end',
    fontFamily: fonts.notosans,
  },
});

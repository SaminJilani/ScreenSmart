import {StyleSheet} from 'react-native';
import {colors, fonts} from '../../assets';
import {height, width} from '../../units';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 5,
    backgroundColor: colors.light_grey,
  },
  container2: {
    flex: 1,
    paddingBottom: height * 8,
    backgroundColor: colors.light_grey,
  },
  appIcon: {
    width: width * 12,
    height: height * 5,
    resizeMode: 'contain',
  },
  headingText: {
    fontFamily: fonts.notosansSemiBold,
    fontSize: 13,
    color: colors.black,
    margin: width * 2,
  },
  reading: {
    fontFamily: fonts.notosansBold,
    fontSize: 21,
    color: colors.black,
    marginLeft: width * 3,
  },

  itemText: {
    fontSize: 13,
    marginLeft: 8,
    color: colors.black,
    fontFamily: fonts.notosans,
    // Space between the vertical line and text
  },
  itemText2: {
    fontSize: 13,
    marginLeft: 8,
    color: colors.black,
    fontFamily: fonts.notosansBold,
    margin: width,
    // Space between the vertical line and text
  },
  line: {
    position: 'absolute',
    left: '51%', // Center the line horizontally
    top: 0,
    bottom: 0,
    width: 4, // Thickness of the vertical line
    backgroundColor: colors.primary, // Color of the vertical line
    transform: [{translateX: -2}], // Center the line by half its width
  },
  circle: {
    position: 'absolute',
    left: '49.3%', // Center the line horizontally
    top: -12,
    bottom: 0,
    width: width * 4,
    height: height * 2, // Thickness of the vertical line
    transform: [{translateX: -2}], // Center the line by half its width
    borderRadius: 100,
    borderWidth: 4,
    borderColor: colors.primary,
  },
  circle2: {
    position: 'absolute',
    left: '49.6%', // Center the line horizontally
    top: 80,
    bottom: 0,
    width: width * 4,
    height: height * 2, // Thickness of the vertical line
    transform: [{translateX: -2}], // Center the line by half its width
    borderRadius: 100,
    borderWidth: 4,
    borderColor: colors.primary,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 8, // Space between the vertical line and content
    flex: 1,
    paddingTop: width,

    backgroundColor: colors.white,
  },
});

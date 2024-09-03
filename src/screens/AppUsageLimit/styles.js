import {StyleSheet} from 'react-native';
import {colors, fonts} from '../../assets';
import {height, width} from '../../units';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    // padding: 16,
    backgroundColor: '#fff',
  },
  floatingButton: {
    width: width * 35,
    height: height * 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    width: width * 35,
    height: height * 7,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    position: 'absolute',
    bottom: 20,
  },
  floatingView: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    right: 30,
    bottom: 30,
    backgroundColor: colors.primary,
    borderRadius: 20,
    elevation: 1.5,
  },
  sheetcontainer: {
    flex: 1,
    paddingHorizontal: 18,
    backgroundColor: '#f4f4f4',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
  },
  dropdown: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 4,
    justifyContent: 'flex-start',
    flexDirection: 'row',
    alignContent: 'flex-start',
    alignItems: 'center',
    fontFamily: fonts.notosansSemiBold,
    marginTop: 1.5 * height,
  },
  selectedText: {
    fontSize: 16,
    color: 'black',
    fontFamily: fonts.notosansSemiBold,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    maxHeight: '70%',
    backgroundColor: 'white',
    borderRadius: 4,
    padding: 20,
  },
  searchInput: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 20,
    paddingHorizontal: 10,
    color: colors.black,
  },
  listContainer: {
    maxHeight: 300,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  icon: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  label: {
    fontSize: 16,
    color: colors.black,
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: 'gray',
    borderRadius: 4,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
  },
  deleteButton: {
    width: width * 9,
    // position: 'absolute',
    alignSelf: 'center',
    marginTop: height,
  },
});

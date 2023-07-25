import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  TextInput,
  Button,
  Image,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { MaterialIcons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Camera, CameraType } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { Keyboard } from 'react-native';
import { db } from './firebase-config';
import { onValue, ref } from 'firebase/database';

export interface MarkerEntity {
  id: string;
  coords: { latitude: number; longitude: number };
  imagePath: string;
  title: string;
  description: string;
  photodate: string;
}

const App = () => {
  const [markers, setMarkers] = useState<MarkerEntity[]>([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isCameraVisible, setCameraVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [markerImageUri, setMarkerImageUri] = useState(null);
  const [markerTitle, setMarkerTitle] = useState('');
  const [markerDescription, setMarkerDescription] = useState('');

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  }; 

  async function getPlace(){
    return onValue (ref(db,'/places'), (snapshot) =>{
      console.log('dados do RealTime',snapshot);
    });
  }

  const cameraRef = useRef(null);
  const [cameraType, setCameraType] = useState(CameraType.back);

  useEffect(() => {
    getLocationPermission();
    getPlace();
  }, []);

  const getLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Permissão de localização não concedida');
    } else {
      getCurrentLocation();
    }
  };

  const getCurrentLocation = async () => {
    const { coords } = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = coords;
    setCurrentLocation({ latitude, longitude });
  };

  const handleAddMarker = () => {
    if (currentLocation && capturedImage) {
      const newMarker: MarkerEntity = {
        id: markers.length.toString(),
        coords: { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
        imagePath: capturedImage,
        title: '',
        description: '',
        photodate: new Date().toString(),
      };
      setMarkers([...markers, newMarker]);
    }
    setCameraVisible(false);
  };

  const saveToGallery = async (photoUri) => {
    try {
      await MediaLibrary.saveToLibraryAsync(photoUri);
      console.log('Imagem salva na galeria');
    } catch (error) {
      console.log('Erro ao salvar imagem na galeria:', error);
    }
  };

  const handleOpenCamera = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      console.log('Permissão da câmera não concedida');
    } else {
      setCameraVisible(true);
    }
  };

  const handleSwitchCamera = () => {
    setCameraType(
      cameraType === CameraType.back
        ? CameraType.front
        : CameraType.back
    );
  };

  const handleCaptureImage = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      await saveToGallery(photo.uri);

      const newMarker: MarkerEntity = {
        id: markers.length.toString(),
        coords: { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
        imagePath: photo.uri,
        title: '',
        description: '',
        photodate: new Date().toString(),
      };
      setMarkers([...markers, newMarker]);

      setCapturedImage(photo.uri);
      setCameraVisible(false);
      handleAddMarker();
    }
  };

  const renderMarkerCallout = (marker: MarkerEntity) => (
    <TouchableOpacity onPress={dismissKeyboard}>
      <Image source={{ uri: marker.imagePath }} style={styles.markerImage} />
      <Text style={{ textAlign: 'center', fontWeight: 'bold', fontStyle: 'italic', color: '#303F9F' }}>{marker.title}</Text>
    </TouchableOpacity>
  );

  const handleMarkerPress = (marker: MarkerEntity) => {
    setMarkerImageUri(marker.imagePath);
    setMarkerTitle(marker.title);
    setMarkerDescription(marker.description);
    setModalVisible(true);
  };

  const handleSaveMarker = () => {
    const updatedMarkers = markers.map((marker) => {
      if (marker.imagePath === markerImageUri) {
        return {
          ...marker,
          title: markerTitle,
          description: markerDescription,
        };
      }
      return marker;
    });

    setMarkers(updatedMarkers);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  const handleGoBackToMap = () => {
    setCameraVisible(false);
  };

  return (
    <View style={styles.container}>
      {isCameraVisible ? (
        <View style={styles.cameraContainer}>
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            type={cameraType}
            onCameraReady={() => console.log('Câmera pronta')}
            onMountError={(error) => console.log('Erro ao montar a câmera:', error)}
          >
            <TouchableOpacity style={styles.captureButton} onPress={handleCaptureImage}>
              <Text style={styles.captureButtonText}>
                <MaterialCommunityIcons name="circle-slice-8" size={60} color="white" />
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.switchCameraButton} onPress={handleSwitchCamera}>
              <Text style={styles.switchCameraButtonText}>
              <MaterialIcons name="flip-camera-android" size={60} color="white" />
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.goBackButton} onPress={handleGoBackToMap}>
              <Text style={styles.goBackButtonText}>
                <MaterialIcons name="arrow-back" size={60} color="white" />
              </Text>
            </TouchableOpacity>
          </Camera>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          {currentLocation ? (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
            >
              {markers.map((marker) => (
                <Marker
                  key={marker.id}
                  coordinate={marker.coords}
                  onPress={() => handleMarkerPress(marker)}
                >
                  {renderMarkerCallout(marker)}
                </Marker>
              ))}
            </MapView>
          ) : (
            <Text style={styles.loadingText}>Carregando mapa...</Text>
          )}

          <TouchableOpacity style={styles.buttonContainer} onPress={handleOpenCamera}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="camera-marker-outline" size={30} color="white" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <TouchableOpacity activeOpacity={1} style={styles.modalContainer} onPress={dismissKeyboard}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {markerImageUri && (
                <Image source={{ uri: markerImageUri }} style={styles.modalImage} />
              )}
              <TextInput
                style={styles.input}
                placeholder="Título"
                value={markerTitle}
                onChangeText={setMarkerTitle}
              />
              <TextInput
                style={styles.input}
                placeholder="Descrição"
                value={markerDescription}
                onChangeText={setMarkerDescription}
                multiline={true}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 60 }}>
                <Button title="Salvar" onPress={handleSaveMarker} color='#000' />
                <Button title="Fechar" onPress={handleCloseModal} color='#000' />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  loadingText: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 16,
    backgroundColor: '#fff8e1'
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    right: 30,
    backgroundColor: '#000',
    borderRadius: 40,
    padding: 15,
    elevation: 5,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#transparent',
  },
  captureButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#transparent',
    borderRadius: 40,
    padding: 15,
    elevation: 5,
    marginLeft: 10,
  },
  captureButtonText: {
    color: '#FFFFFF',
  },
  switchCameraButton: {
    position: 'absolute',
    bottom: 30,
    right: 16,
    backgroundColor: '#transparent',
    borderRadius: 40,
    padding: 15,
    elevation: 5,
    marginStart: 10,
  },
  switchCameraButtonText: {
    color: '#FFFFFF',
  },
  goBackButton: {
    position: 'absolute',
    bottom: 30,
    backgroundColor: '#transparent',
    borderRadius: 40,
    padding: 15,
    elevation: 5,
    left: 16,
  },
  goBackButtonText: {
    color: '#FFFFFF',
  },
  markerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    resizeMode: 'cover',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    width: '80%',
  },
  modalImage: {
    width: 250,
    height: 250,
    borderRadius: 10,
    marginBottom: 10,
    alignSelf: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
});

export default App;

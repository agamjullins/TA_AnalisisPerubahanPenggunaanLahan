// WILAYAH PENELITIAN
Map.centerObject(KABTTU,10);
Map.addLayer(KABTTU,{},'Wilayah Penelitian');

// VISUALISASI
var imageVis = {
bands:['SR_B5','SR_B4','SR_B3'],
min:0.011914999999999995,
max:0.2373325
};

// CLOUD MASKING
function masking(image){
var qa = image.select('QA_PIXEL');
var cloud = 1 << 3;
var shadow = 1 << 4;
var mask = qa.bitwiseAnd(cloud).eq(0).and(qa.bitwiseAnd(shadow).eq(0));
var optical = image.select('SR_B.*')
.multiply(0.0000275)
.add(-0.2);
return optical.updateMask(mask);
}

// MENGAMBIL SEMUA CITRALANDSAT 8 TAHUN 2025
var semuaCitra2025 = ee.ImageCollection(
  'LANDSAT/LC08/C02/T1_L2'
)
.filterBounds(KABTTU)
.filterDate('2025-05-01', '2025-12-31');

print(
  'Jumlah seluruh citra Landsat 8 tahun 2025:',
  semuaCitra2025.size()
);

// DAFTAR SEMUA CITRA 2025 SEBELUM FILTER CLOUD COVER
var daftarSemua2025 = ee.FeatureCollection(
  semuaCitra2025.map(function(image) {

    var centroid =
      image.geometry().centroid();
    var koordinat =
      centroid.coordinates();

    return ee.Feature(null, {
      'ID_Citra':
        image.get('system:index'),
      'Tanggal_Akuisisi':
        image.date().format('YYYY-MM-dd'),
      'Cloud_Cover':
        image.get('CLOUD_COVER'),
      'Path':
        image.get('WRS_PATH'),
      'Row':
        image.get('WRS_ROW'),
      'Longitude':
        koordinat.get(0),
      'Latitude':
        koordinat.get(1)
    });
  })
);

print(
  'SELURUH CITRA 2025'
);

print(
  daftarSemua2025
);

// EXPORT KE CSV
Export.table.toDrive({
  collection: daftarSemua2025,
  description: 'Daftar_Semua_Citra_Landsat_2025',
  folder: 'GEE',
  fileNamePrefix: 'Daftar_Semua_Citra_Landsat_2025',
  fileFormat: 'CSV',
  selectors: [
    'ID_Citra',
    'Tanggal_Akuisisi',
    'Cloud_Cover',
    'Path',
    'Row',
    'Longitude',
    'Latitude'
  ]
});

// MEMFILTER CITRA DENGAN CLOUD COVER < 20%
var dataset2025 = semuaCitra2025
.filter(
  ee.Filter.lt('CLOUD_COVER', 20)
);

print(
  'Jumlah citra setelah Cloud Cover < 20%:',
  dataset2025.size()
);

// MEMBUAT DAFTAR CITRA
var daftar2025 = ee.FeatureCollection(
  dataset2025.map(function(image) {

    // Titik tengah/centroid citra
    var centroid = image.geometry().centroid();

    // Koordinat
    var koordinat = centroid.coordinates();

    return ee.Feature(null, {
      'ID_Citra': image.get('system:index'),
      'Tanggal_Akuisisi':
        image.date().format('YYYY-MM-dd'),
      'Cloud_Cover':
        image.get('CLOUD_COVER'),
      'Path':
        image.get('WRS_PATH'),
      'Row':
        image.get('WRS_ROW'),
      'Longitude':
        koordinat.get(0),
      'Latitude':
        koordinat.get(1)
    });
  })
);


// MENAMPILKAN HASIL
print(' DAFTAR CITRA 2025 ');
print(daftar2025);
print('Jumlah Data 2025:', daftar2025.size());

// EXPORT KE CSV
Export.table.toDrive({
  collection: daftar2025,
  description: 'Daftar_Citra_Landsat_2025',
  folder: 'GEE',
  fileNamePrefix: 'Daftar_Citra_Landsat_2025',
  fileFormat: 'CSV',
  selectors: [
    'ID_Citra',
    'Tanggal_Akuisisi',
    'Cloud_Cover',
    'Path',
    'Row',
    'Longitude',
    'Latitude'
  ]
});


// PREPROCESSING 2025
var image2025 = dataset2025
.map(masking)
.median()
.clip(KABTTU);

// NDVI
var ndvi2025 = image2025.normalizedDifference(['SR_B5','SR_B4']).rename('NDVI');

// NDBI
var ndbi2025 = image2025.normalizedDifference(['SR_B6','SR_B5']).rename('NDBI');

// NDWI
var ndwi2025 = image2025.normalizedDifference(['SR_B3','SR_B5']).rename('NDWI');

// Gabungkan menjadi satu image
image2025 = image2025
.addBands(ndvi2025)
.addBands(ndbi2025)
.addBands(ndwi2025);

// VISUALISASI
Map.addLayer(image2025,imageVis,'Landsat 2025');

// BAND INPUT RANDOM FOREST
var bands=['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7','NDVI','NDBI','NDWI'];

// Gabungkan semua polygon sampel
var sample = Permukiman2025
  .merge(Lahan_Pertanian2025)
  .merge(Kebun_Campuran2025)
  .merge(Vegetasi2025)
  .merge(Badan_Air2025);

print('Polygon Sampel:', sample);

// MEMBUAT BAND KLASIFIKASI

// Mengubah polygon training menjadi raster kelas
var kelasImage = ee.Image().byte().paint({
  featureCollection: sample,
  color: 'klasifikasi'
}).rename('klasifikasi');

// MENGAMBIL 100 PIXEL SETIAP KELAS

var allSample = image2025
  .select(bands)
  .addBands(kelasImage)
  .stratifiedSample({
    numPoints: 100,
    classBand: 'klasifikasi',
    region: sample.geometry(),
    scale: 30,
    classValues: [0, 1, 2, 3, 4],
    classPoints: [100, 100, 100, 100, 100],
    geometries: true,
    seed: 1
  });

print('TOTAL SAMPLE');

print('Total Sample:', allSample.size());

print('Sample Per Kelas:',
  allSample.aggregate_histogram('klasifikasi'));

// FUNGSI PEMBAGIAN PER KELAS

function splitClass(classValue) {

  // Ambil satu kelas
  var kelas = allSample
    .filter(ee.Filter.eq('klasifikasi', classValue))
    .randomColumn('random', classValue);

  // Urutkan berdasarkan random
  var sorted = kelas.sort('random');

  // pixel pertama = TRAINING
  var training = sorted.limit(80);

  // pixel berikutnya = TESTING
  var testingList = sorted.toList(100);

  var testing = ee.FeatureCollection(
    ee.List.sequence(80, 99).map(function(i) {
      return ee.Feature(testingList.get(i));
    })
  );

  return {
    training: training,
    testing: testing
  };
}

// PEMBAGIAN MASING-MASING KELAS
var split0 = splitClass(0); // Permukiman
var split1 = splitClass(1); // Lahan Pertanian
var split2 = splitClass(2); // Kebun Campuran
var split3 = splitClass(3); // Vegetasi
var split4 = splitClass(4); // Badan Air

// GABUNGKAN DATA TRAINING
var train2025 = split0.training
  .merge(split1.training)
  .merge(split2.training)
  .merge(split3.training)
  .merge(split4.training);

// GABUNGKAN DATA TESTING

var test2025 = split0.testing
  .merge(split1.testing)
  .merge(split2.testing)
  .merge(split3.testing)
  .merge(split4.testing);

// CEK HASIL PEMBAGIAN
print('TRAINING 2025');

print('Total Training 2025:', train2025.size());

print('Training Per Kelas:',
  train2025.aggregate_histogram('klasifikasi'));

print('TESTING 2025');

print('Total Testing 2025:', test2025.size());

print('Testing Per Kelas:',
  test2025.aggregate_histogram('klasifikasi'));

// RANDOM FOREST 2025
var classifier2025 = ee.Classifier.smileRandomForest({
numberOfTrees:100,
seed:1
})
.train({
features:train2025,
classProperty:'klasifikasi',
inputProperties:bands
});


// INFORMASI MODEL RANDOM FOREST 2015
var explain2025 = classifier2025.explain();

// EXPORT 100 POHON RANDOM FOREST 2025
var trees2025 = ee.List(
  ee.Dictionary(explain2025).get('trees')
);

var treeFeatures2025 = ee.FeatureCollection(
  trees2025.map(function(tree) {
    return ee.Feature(null, {
      tree: ee.String(tree)
    });
  })
);

print('Jumlah Pohon:', treeFeatures2025.size());

Export.table.toDrive({
  collection: treeFeatures2025,
  description: 'RandomForest_Trees_2025',
  folder: 'GEE',
  fileNamePrefix: 'RandomForest_Trees_2025',
  fileFormat: 'CSV'
});

print(' INFORMASI RANDOM FOREST 2025 ');
print('Model Random Forest 2025:', explain2025);

// KLASIFIKASI TAHUN 2025
var hasil2025 = image2025
.select(bands)
.classify(classifier2025);

// PALETTE WARNA
var palette = {
min:0,
max:4,
palette:['#ff0101', '#74ff05', '#ffab1a', '#187f36', '#00ffff' ]};

// MENAMPILKAN HASIL KLASIFIKASI
Map.addLayer(hasil2025.clip(KABTTU),palette,'Klasifikasi RF 2025');

// CEK HASIL
print('Classifier 2025',classifier2025);
print('Hasil Klasifikasi 2025',hasil2025);

// EVALUASI AKURASI TAHUN 2025
var validasi2025 = test2025.classify(classifier2025);

// Confusion Matrix
var matrix2025 = validasi2025.errorMatrix(
'klasifikasi',
'classification'
);
print(' HASIL EVALUASI 2025 ');
print('Confusion Matrix 2025', matrix2025);
print('Overall Accuracy 2025', matrix2025.accuracy());
print('Kappa 2025', matrix2025.kappa());
print('Producer Accuracy 2025', matrix2025.producersAccuracy());
print('User Accuracy 2025', matrix2025.consumersAccuracy());

// MENGHITUNG LUAS PER KELAS TAHUN 2025
var luas2025 =
ee.Image.pixelArea()
.addBands(hasil2025)
.divide(10000)
.reduceRegion({
reducer:ee.Reducer.sum().group({
groupField:1,
groupName:'kelas'
}),
geometry:KABTTU,
scale:30,
maxPixels:1e13
});
print('Luas Penggunaan Lahan 2025 (ha)',luas2025);

// GRAFIK LUAS PENGGUNAAN LAHAN 2025
var chart2025 = ui.Chart.image.byClass({
image:ee.Image.pixelArea()
.addBands(hasil2025)
.divide(1000000),
classBand:'classification',
region:KABTTU,
reducer:ee.Reducer.sum(),
scale:30
})
.setSeriesNames(['Permukiman','Lahan Pertanian','Kebun Campuran','Vegetasi','Badan Air'])
.setOptions({
title:'Grafik Penggunaan Lahan Tahun 2025',
hAxis:{title:'Kelas Penggunaan Lahan'},
vAxis:{title:'Luas (km²)'},
legend:{position:'right'},
series:{
  0:{color:'#ff0101'},   // Permukiman
  1:{color:'#74ff05'},   // Lahan Pertanian
  2:{color:'#ffab1a'},   // Kebun Campuran
  3:{color:'#187f36'},   // Vegetasi
  4:{color:'#00ffff'}    // Badan Air
}
});
print(chart2025);

// EXPORT HASIL KLASIFIKASI 2025
Export.image.toDrive({
  image: hasil2025.toInt8(),
  description: 'RF_2025',
  folder: 'GEE',
  fileNamePrefix: 'RandomForest_2025',
  region: KABTTU.geometry(),
  scale: 30,
  fileFormat: 'GeoTIFF',
  maxPixels: 1e13
});

// EXPORT DATA TRAINING
Export.table.toDrive({
collection:sample,
description:'Training_Sample',
fileFormat:'SHP'
});

//EXPORT KLASIFIKASI 2025 KE SHP
var shp2025 = hasil2025.reduceToVectors({
  geometry: KABTTU.geometry(),
  scale: 30,
  geometryType: 'polygon',
  eightConnected: false,
  labelProperty: 'klasifikasi',
  maxPixels: 1e13,
});

Export.table.toDrive({
  collection: shp2025,
  description: 'SHP_Penggunaan_Lahan_2025',
  folder: 'GEE',
  fileNamePrefix: 'Penggunaan_Lahan_2025',
  fileFormat: 'SHP'
});

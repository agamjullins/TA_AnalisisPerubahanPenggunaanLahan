// WILAYAH PENELITIAN
Map.centerObject(KABTTU,10);
Map.addLayer(KABTTU,{},'Wilayah Penelitian');

// MENGAMBIL SEMUA CITRALANDSAT 8 TAHUN 2015
var semuaCitra2015 = ee.ImageCollection(
  'LANDSAT/LC08/C02/T1_L2'
)
.filterBounds(KABTTU)
.filterDate('2015-05-01', '2015-12-31');

print(
  'Jumlah seluruh citra Landsat 8 tahun 2015:',
  semuaCitra2015.size()
);

// DAFTAR SEMUA CITRA 2015
// SEBELUM FILTER CLOUD COVER
var daftarSemua2015 = ee.FeatureCollection(
  semuaCitra2015.map(function(image) {

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
  'SELURUH CITRA 2015'
);

print(
  daftarSemua2015
);

// EXPORT KE CSV
Export.table.toDrive({
  collection: daftarSemua2015,
  description: 'Daftar_Semua_Citra_Landsat_2015',
  folder: 'GEE',
  fileNamePrefix: 'Daftar_Semua_Citra_Landsat_2015',
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
var dataset2015 = semuaCitra2015
.filter(
  ee.Filter.lt('CLOUD_COVER', 20)
);

print(
  'Jumlah citra setelah Cloud Cover < 20%:',
  dataset2015.size()
);

// MEMBUAT DAFTAR CITRA
var daftar2015 = ee.FeatureCollection(
  dataset2015.map(function(image) {

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
print(' DAFTAR CITRA 2015 ');
print(daftar2015);
print('Jumlah Data 2015:', daftar2015.size());

// EXPORT KE CSV
Export.table.toDrive({
  collection: daftar2015,
  description: 'Daftar_Citra_Landsat_2015',
  folder: 'GEE',
  fileNamePrefix: 'Daftar_Citra_Landsat_2015',
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

// CLOUD MASKING
function masking(image){
var qa = image.select('QA_PIXEL');
var cloud = 1 << 3;
var shadow = 1 << 4;
var mask = qa.bitwiseAnd(cloud).eq(0).and(qa.bitwiseAnd(shadow).eq(0));
var optical = image.select('SR_B.*').multiply(0.0000275).add(-0.2);
return optical.updateMask(mask);
}

// PREPROCESSING 2015
var image2015 = dataset2015
.map(masking)
.median()
.clip(KABTTU);

// VISUALISASI KOMPOSIT
var imageVis = {
bands:['SR_B5','SR_B4','SR_B3'],
min:0.011914999999999995,max:0.2373325};

// NDVI
var ndvi2015 = image2015.normalizedDifference(['SR_B5','SR_B4']).rename('NDVI');

// NDBI
var ndbi2015 = image2015.normalizedDifference(['SR_B6','SR_B5']).rename('NDBI');

// NDWI
var ndwi2015 = image2015.normalizedDifference(['SR_B3','SR_B5']).rename('NDWI');

// Gabungkan menjadi satu image
image2015 = image2015
.addBands(ndvi2015)
.addBands(ndbi2015)
.addBands(ndwi2015);

// VISUALISASI
Map.addLayer(image2015,imageVis,'Landsat 2015');

// BAND INPUT RANDOM FOREST
var bands=['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7','NDVI','NDBI','NDWI'];

// TRAINING SAMPLE
// 100 PIXEL PER KELAS

// Gabungkan semua polygon sampel
var sample = Permukiman2015
  .merge(Lahan_Pertanian2015)
  .merge(Kebun_Campuran2015)
  .merge(Vegetasi2015)
  .merge(Badan_Air2015);
print('Polygon Sampel:', sample);

// MEMBUAT BAND KLASIFIKASI

// Mengubah polygon training menjadi raster kelas
var kelasImage = ee.Image().byte().paint({
  featureCollection: sample,
  color: 'klasifikasi'
}).rename('klasifikasi');

// MENGAMBIL 100 PIXEL SETIAP KELAS
var allSample = image2015
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

// FUNGSI PEMBAGIAN DATA PER KELAS
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
var train2015 = split0.training
  .merge(split1.training)
  .merge(split2.training)
  .merge(split3.training)
  .merge(split4.training);

// GABUNGKAN DATA TESTING
var test2015 = split0.testing
  .merge(split1.testing)
  .merge(split2.testing)
  .merge(split3.testing)
  .merge(split4.testing);

// CEK HASIL PEMBAGIAN
print('TRAINING 2015');
print('Total Training 2015:', train2015.size());
print('Training Per Kelas:',
  train2015.aggregate_histogram('klasifikasi'));

print('TESTING 2015');
print('Total Testing 2015:', test2015.size());

print('Testing Per Kelas:',
  test2015.aggregate_histogram('klasifikasi'));

// RANDOM FOREST 2015
var classifier2015 = ee.Classifier.smileRandomForest({
numberOfTrees:100,
seed:1
})
.train({
features:train2015,
classProperty:'klasifikasi',
inputProperties:bands
});

// INFORMASI MODEL RANDOM FOREST 2015
var explain2015 = classifier2015.explain();

// EXPORT 100 POHON RANDOM FOREST 2015
var trees2015 = ee.List(
  ee.Dictionary(explain2015).get('trees')
);

var treeFeatures2015 = ee.FeatureCollection(
  trees2015.map(function(tree) {
    return ee.Feature(null, {
      tree: ee.String(tree)
    });
  })
);

print('Jumlah Pohon:', treeFeatures2015.size());

Export.table.toDrive({
  collection: treeFeatures2015,
  description: 'RandomForest_Trees_2015',
  folder: 'GEE',
  fileNamePrefix: 'RandomForest_Trees_2015',
  fileFormat: 'CSV'
});

print(' INFORMASI RANDOM FOREST 2015 ');
print('Model Random Forest 2015:', explain2015);

// KLASIFIKASI TAHUN 2015
var hasil2015 = image2015
.select(bands)
.classify(classifier2015);

// PALETTE WARNA
var palette = {
min:0,
max:4,
palette:['#ff0101', '#74ff05', '#ffab1a', '#187f36', '#00ffff' ]};

// MENAMPILKAN HASIL KLASIFIKASI
Map.addLayer(hasil2015.clip(KABTTU),palette,'Klasifikasi RF 2015');

// CEK HASIL
print('Classifier 2015',classifier2015);
print('Hasil Klasifikasi 2015',hasil2015);

// EVALUASI AKURASI TAHUN 2015
var validasi2015 = test2015.classify(classifier2015);

// Confusion Matrix
var matrix2015 = validasi2015.errorMatrix(
'klasifikasi',
'classification'
);
print('===== HASIL EVALUASI 2015 =====');
print('Confusion Matrix 2015', matrix2015);
print('Overall Accuracy 2015', matrix2015.accuracy());
print('Kappa 2015', matrix2015.kappa());
print('Producer Accuracy 2015', matrix2015.producersAccuracy());
print('User Accuracy 2015', matrix2015.consumersAccuracy());

// MENGHITUNG LUAS PER KELAS TAHUN 2015
var luas2015 =
ee.Image.pixelArea()
.addBands(hasil2015)
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
print('Luas Penggunaan Lahan 2015 (ha)',luas2015);

// GRAFIK LUAS PENGGUNAAN LAHAN 2015
var chart2015 = ui.Chart.image.byClass({
image:ee.Image.pixelArea()
.addBands(hasil2015)
.divide(1000000),
classBand:'classification',
region:KABTTU,
reducer:ee.Reducer.sum(),
scale:30
})
.setSeriesNames(['Permukiman','Lahan Pertanian','Kebun Campuran','Vegetasi','Badan Air'])
.setOptions({
title:'Grafik Penggunaan Lahan Tahun 2015',
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
print(chart2015);

// EXPORT HASIL KLASIFIKASI 2015
Export.image.toDrive({
image:hasil2015,
description:'RF_2015',
folder:'GEE',
fileNamePrefix:'RandomForest_2015',
region:KABTTU,
scale:30,
maxPixels:1e13
});


// EXPORT DATA TRAINING
Export.table.toDrive({
collection:sample,
description:'Training_Sample',
fileFormat:'SHP'
});

//EXPORT KLASIFIKASI 2015 KE SHP
var shp2015 = hasil2015.reduceToVectors({
  geometry: KABTTU.geometry(),
  scale: 30,
  geometryType: 'polygon',
  eightConnected: false,
  labelProperty: 'klasifikasi',
  maxPixels: 1e13
});

Export.table.toDrive({
  collection: shp2015,
  description: 'SHP_Penggunaan_Lahan_2015',
  folder: 'GEE',
  fileNamePrefix: 'Penggunaan_Lahan_2015',
  fileFormat: 'SHP'
});

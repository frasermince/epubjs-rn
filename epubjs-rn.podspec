require "json"
package = JSON.parse(File.read('package.json'))

Pod::Spec.new do |s|
  s.name             = package['name']
  s.version          = package['version']
  s.summary          = package['description']
  s.requires_arc = true
  s.license      = 'FreeBSD'
  s.homepage     = 'n/a'
  s.source       = { :git => "https://github.com/frasermince/epubjs-rn" }
  s.author       = 'Futurepress'
  s.source_files = 'ios/**/*.{h,m}'
  s.platform     = :ios, "8.0"

  s.dependency "react-native-static-server"
  s.dependency "react-native-webview"
  s.dependency "react-native-zip-archive"
  s.dependency "rn-fetch-blob"
  s.dependency "@lightbase/react-native-orientation"
  s.dependency "@react-native-community/async-storage"
  s.dependency "React"
  s.dependency "EpubReader"
end

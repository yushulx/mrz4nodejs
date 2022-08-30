{
    "targets": [
        {
            'target_name': "mrzscanner",
            'sources': ["src/mrzscanner.cc"],
            'include_dirs': [
                        "include"
            ],
            'conditions': [
                ['OS=="linux"', {
                    'defines': [
                        'LINUX_MRZ',
                    ],
                    "cflags" : [
                        "-std=c++11"
                    ],
                    'ldflags': [
                                "-Wl,-rpath=$ORIGIN"
                    ],
                    
                    'libraries': [
                        "-lDynamsoftLabelRecognizer", "-L../lib/linux"
                    ],
                    'copies': [
                        {
                            'destination': 'build/Release/',
                            'files': [
                                './lib/linux/libDynamicPdf.so',
                                './lib/linux/libDynamsoftLabelRecognizer.so',
                                './lib/linux/libDynamsoftLicenseClient.so',
                            ]
                        }
                    ]
                }],
                ['OS=="win"', {
                    'defines': [
                        'WINDOWS_MRZ',
                    ],
                    'libraries': [
                        "-l../lib/win/DynamsoftLabelRecognizerx64.lib"
                    ],
                    'copies': [
                        {
                            'destination': 'build/Release/',
                            'files': [
                                './lib/win/DynamsoftLabelRecognizerx64.dll',
                                './lib/win/DynamsoftLicenseClientx64.dll',
                                './lib/win/vcomp140.dll',
                                './lib/win/DynamicPdfx64.dll',
                            ]
                        }
                    ]
                }]
            ]
        }
    ]
}

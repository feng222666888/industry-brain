# CWRU Bearing Fault Dataset

Source: Case Western Reserve University Bearing Data Center
URL: https://engineering.case.edu/bearingdatacenter/download-data-file

Download .mat files into this directory, then run the preprocessing script:

```bash
cd data_pipeline
python -m datasets.petrochemical.cwru.preprocess
```

Files needed (12kHz drive end):
- normal_0.mat (Normal baseline)
- IR007_0.mat (Inner race fault 0.007")
- OR007_6_0.mat (Outer race fault 0.007")
- B007_0.mat (Ball fault 0.007")

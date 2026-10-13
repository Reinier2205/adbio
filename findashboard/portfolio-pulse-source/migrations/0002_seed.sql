-- Record 1: 2026-07-10
INSERT OR IGNORE INTO records (date, total) VALUES ('2026-07-10', 11084990.03);
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Living Annuity', 'AGLA1133029', 9285784.84
  FROM records r WHERE r.date = '2026-07-10'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Living Annuity');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Investment Platform Unit Trust', 'AGLP1134728', 1540739.04
  FROM records r WHERE r.date = '2026-07-10'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Investment Platform Unit Trust');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Tax-Free Investment', 'AGTF1219326', 258466.15
  FROM records r WHERE r.date = '2026-07-10'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Tax-Free Investment');

-- Record 2: 2026-07-20
INSERT OR IGNORE INTO records (date, total) VALUES ('2026-07-20', 11104580.54);
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Living Annuity', 'AGLA1133029', 9300873.94
  FROM records r WHERE r.date = '2026-07-20'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Living Annuity');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Investment Platform Unit Trust', 'AGLP1134728', 1544701.7
  FROM records r WHERE r.date = '2026-07-20'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Investment Platform Unit Trust');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Tax-Free Investment', 'AGTF1219326', 259004.9
  FROM records r WHERE r.date = '2026-07-20'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Tax-Free Investment');

-- Record 3: 2026-07-24
INSERT OR IGNORE INTO records (date, total) VALUES ('2026-07-24', 11075072.88);
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Living Annuity', 'AGLA1133029', 9268565.24
  FROM records r WHERE r.date = '2026-07-24'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Living Annuity');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Investment Platform Unit Trust', 'AGLP1134728', 1546185.97
  FROM records r WHERE r.date = '2026-07-24'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Investment Platform Unit Trust');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Tax-Free Investment', 'AGTF1219326', 260321.67
  FROM records r WHERE r.date = '2026-07-24'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Tax-Free Investment');

-- Record 4: 2026-07-31
INSERT OR IGNORE INTO records (date, total) VALUES ('2026-07-31', 11199859.29);
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Living Annuity', 'AGLA1133029', 9377386.56
  FROM records r WHERE r.date = '2026-07-31'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Living Annuity');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Investment Platform Unit Trust', 'AGLP1134728', 1561193.2
  FROM records r WHERE r.date = '2026-07-31'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Investment Platform Unit Trust');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Tax-Free Investment', 'AGTF1219326', 261279.52
  FROM records r WHERE r.date = '2026-07-31'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Tax-Free Investment');

-- Record 5: 2026-08-07
INSERT OR IGNORE INTO records (date, total) VALUES ('2026-08-07', 11376425.81);
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Living Annuity', 'AGLA1133029', 9524876.89
  FROM records r WHERE r.date = '2026-08-07'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Living Annuity');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Investment Platform Unit Trust', 'AGLP1134728', 1583937.11
  FROM records r WHERE r.date = '2026-08-07'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Investment Platform Unit Trust');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Tax-Free Investment', 'AGTF1219326', 267611.82
  FROM records r WHERE r.date = '2026-08-07'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Tax-Free Investment');

-- Record 6: 2026-08-14
INSERT OR IGNORE INTO records (date, total) VALUES ('2026-08-14', 11243888.88);
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Living Annuity', 'AGLA1133029', 9409685.41
  FROM records r WHERE r.date = '2026-08-14'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Living Annuity');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Investment Platform Unit Trust', 'AGLP1134728', 1569394.08
  FROM records r WHERE r.date = '2026-08-14'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Investment Platform Unit Trust');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Tax-Free Investment', 'AGTF1219326', 264809.38
  FROM records r WHERE r.date = '2026-08-14'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Tax-Free Investment');

-- Record 7: 2026-08-21
INSERT OR IGNORE INTO records (date, total) VALUES ('2026-08-21', 11222595.52);
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Living Annuity', 'AGLA1133029', 9387513.13
  FROM records r WHERE r.date = '2026-08-21'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Living Annuity');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Investment Platform Unit Trust', 'AGLP1134728', 1567829.44
  FROM records r WHERE r.date = '2026-08-21'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Investment Platform Unit Trust');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Tax-Free Investment', 'AGTF1219326', 267252.96
  FROM records r WHERE r.date = '2026-08-21'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Tax-Free Investment');

-- Record 8: 2026-08-28
INSERT OR IGNORE INTO records (date, total) VALUES ('2026-08-28', 11254613.57);
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Living Annuity', 'AGLA1133029', 9414064.14
  FROM records r WHERE r.date = '2026-08-28'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Living Annuity');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Investment Platform Unit Trust', 'AGLP1134728', 1572210.1
  FROM records r WHERE r.date = '2026-08-28'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Investment Platform Unit Trust');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Tax-Free Investment', 'AGTF1219326', 268339.32
  FROM records r WHERE r.date = '2026-08-28'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Tax-Free Investment');

-- Record 9: 2026-09-04
INSERT OR IGNORE INTO records (date, total) VALUES ('2026-09-04', 11172595.61);
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Living Annuity', 'AGLA1133029', 9346000.79
  FROM records r WHERE r.date = '2026-09-04'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Living Annuity');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Investment Platform Unit Trust', 'AGLP1134728', 1561159.36
  FROM records r WHERE r.date = '2026-09-04'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Investment Platform Unit Trust');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Tax-Free Investment', 'AGTF1219326', 265435.46
  FROM records r WHERE r.date = '2026-09-04'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Tax-Free Investment');

-- Record 10: 2026-09-14
INSERT OR IGNORE INTO records (date, total) VALUES ('2026-09-14', 11130743.34);
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Living Annuity', 'AGLA1133029', 9310291.42
  FROM records r WHERE r.date = '2026-09-14'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Living Annuity');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Investment Platform Unit Trust', 'AGLP1134728', 1555727.31
  FROM records r WHERE r.date = '2026-09-14'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Investment Platform Unit Trust');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Tax-Free Investment', 'AGTF1219326', 264724.61
  FROM records r WHERE r.date = '2026-09-14'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Tax-Free Investment');

-- Record 11: 2026-09-25
INSERT OR IGNORE INTO records (date, total) VALUES ('2026-09-25', 11066459.72);
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Living Annuity', 'AGLA1133029', 9254431.72
  FROM records r WHERE r.date = '2026-09-25'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Living Annuity');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Investment Platform Unit Trust', 'AGLP1134728', 1548583.67
  FROM records r WHERE r.date = '2026-09-25'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Investment Platform Unit Trust');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Tax-Free Investment', 'AGTF1219326', 263444.33
  FROM records r WHERE r.date = '2026-09-25'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Tax-Free Investment');

-- Record 12: 2026-10-02
INSERT OR IGNORE INTO records (date, total) VALUES ('2026-10-02', 10988480.85);
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Living Annuity', 'AGLA1133029', 9185389.07
  FROM records r WHERE r.date = '2026-10-02'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Living Annuity');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Investment Platform Unit Trust', 'AGLP1134728', 1541244.42
  FROM records r WHERE r.date = '2026-10-02'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Investment Platform Unit Trust');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Tax-Free Investment', 'AGTF1219326', 261847.36
  FROM records r WHERE r.date = '2026-10-02'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Tax-Free Investment');

-- Record 13: 2026-10-09
INSERT OR IGNORE INTO records (date, total) VALUES ('2026-10-09', 11006994.22);
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Living Annuity', 'AGLA1133029', 9200102.58
  FROM records r WHERE r.date = '2026-10-09'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Living Annuity');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Investment Platform Unit Trust', 'AGLP1134728', 1544854.32
  FROM records r WHERE r.date = '2026-10-09'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Investment Platform Unit Trust');
INSERT INTO fund_values (record_id, name, code, value)
  SELECT r.id, 'Tax-Free Investment', 'AGTF1219326', 262037.32
  FROM records r WHERE r.date = '2026-10-09'
  AND NOT EXISTS (SELECT 1 FROM fund_values fv WHERE fv.record_id = r.id AND fv.name = 'Tax-Free Investment');

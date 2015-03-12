CREATE DATABASE IF NOT EXISTS chameleon_log;

-- login info
CREATE TABLE IF NOT EXISTS chameleon_log.login (
     recordid BIGINT UNSIGNED PRIMARY KEY,
     product VARCHAR(64) NOT NULL,
     channel VARCHAR(32) NOT NULL,
     time TIMESTAMP NOT NULL,
     uid VARCHAR(128) NOT NULL,
     others TEXT,
     INDEX (uid)
)
ENGINE=INNODB
CHARACTER SET = utf8
;

-- pay info
CREATE TABLE IF NOT EXISTS chameleon_log.pay (
    recordId BIGINT UNSIGNED PRIMARY KEY,
    product VARCHAR(64) NOT NULL,
    channel VARCHAR(32) NOT NULL,
    time TIMESTAMP NOT NULL,
    uid VARCHAR(128) NOT NULL,
    appUid VARCHAR(128),
    orderId VARCHAR(36) NOT NULL,
    chOrderId VARCHAR(36),
    serverId VARCHAR(16),
    status TINYINT(8) NOT NULL,
    productId VARCHAR(64),
    productCount SMALLINT NOT NULL,
    realPayMoney INT NOT NULL,
    ext TEXT,
    code TINYINT(4),
    INDEX (uid),
    INDEX (orderId)
)
ENGINE=INNODB
CHARACTER SET = utf8
;

-- pre-pay info
CREATE TABLE IF NOT EXISTS chameleon_log.pre_pay (
    recordId BIGINT UNSIGNED PRIMARY KEY,
    product VARCHAR(64) NOT NULL,
    channel VARCHAR(32) NOT NULL,
    time TIMESTAMP NOT NULL,
    uid VARCHAR(128) NOT NULL,
    appUid VARCHAR(128),
    orderId VARCHAR(36) NOT NULL,
    serverId VARCHAR(16) NOT NULL, -- sId
    productId VARCHAR(64), -- pId
    productCount SMALLINT NOT NULL, -- count
    realPayMoney INT NOT NULL, -- rmb
    ext TEXT,
    INDEX (uid),
    INDEX (orderId)
)
ENGINE=INNODB
CHARACTER SET = utf8
;

-- pay-cancel info
CREATE TABLE IF NOT EXISTS chameleon_log.pay_cancel (
    recordId BIGINT UNSIGNED PRIMARY KEY,
    product VARCHAR(64) NOT NULL,
    channel VARCHAR(32) NOT NULL,
    time TIMESTAMP NOT NULL,
    orderId VARCHAR(36) NOT NULL,
    chOrderId VARCHAR(48) NOT NULL, -- billno
    realPayMoney INT NOT NULL, -- rmb
    code INT,
    INDEX (orderId)
)
ENGINE=INNODB
CHARACTER SET = utf8
;

-- disgard-order info
CREATE TABLE IF NOT EXISTS chameleon_log.disgard_order (
    recordId BIGINT UNSIGNED PRIMARY KEY,
    product VARCHAR(64),
    channel VARCHAR(32),
    time TIMESTAMP,
    uid VARCHAR(128),
    appUid VARCHAR(128),
    orderId VARCHAR(36),
    chOrderId VARCHAR(36),
    serverId VARCHAR(16), -- sId
    productId VARCHAR(64), -- pId
    productCount SMALLINT, -- count
    realPayMoney INT, -- rmb
    ext TEXT,
    code TINYINT(2),
    INDEX (uid),
    INDEX (orderId)
)
ENGINE=INNODB
CHARACTER SET = utf8
;





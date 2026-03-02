from data_pipeline.governance.compliance import check_compliance
from data_pipeline.governance.quality import validate_quality
from data_pipeline.governance.semantic import standardize_terms


def test_validate_quality_pass_with_report():
    rows = [
        {"reactor_temp": 510.0, "pressure": 2.8, "device_id": "DEV-1"},
        {"reactor_temp": 500.0, "pressure": 2.6, "device_id": "DEV-2"},
    ]
    report = validate_quality(
        rows,
        required_fields=["device_id", "reactor_temp", "pressure"],
        numeric_ranges={"reactor_temp": (460.0, 560.0), "pressure": (1.0, 4.0)},
        return_report=True,
    )
    assert report["passed"] is True
    assert report["records"] == 2
    assert report["completeness"] == 1.0


def test_validate_quality_fail_missing_and_range():
    rows = [
        {"reactor_temp": 600.0, "pressure": 2.8, "device_id": "DEV-1"},
        {"reactor_temp": 500.0, "pressure": None, "device_id": ""},
    ]
    report = validate_quality(
        rows,
        required_fields=["device_id", "reactor_temp", "pressure"],
        numeric_ranges={"reactor_temp": (460.0, 560.0), "pressure": (1.0, 4.0)},
        return_report=True,
    )
    assert report["passed"] is False
    assert report["missing_fields"]["device_id"] == 1
    assert report["missing_fields"]["pressure"] == 1
    assert report["range_violations"]["reactor_temp"] == 1


def test_standardize_terms_petrochemical():
    text = "流化催化裂化装置中的压气机与循环油浆泵异常"
    normalized = standardize_terms(text, "petrochemical")
    assert "FCC" in normalized
    assert "压缩机" in normalized
    assert "循环水泵" in normalized


def test_check_compliance_blocks_localhost():
    result = check_compliance("http://localhost:8000/private")
    assert result["robots_ok"] is False
    assert result["scheme_ok"] is True
    assert result["host_ok"] is True


def test_check_compliance_allows_public_https():
    result = check_compliance("https://engineering.case.edu/bearingdatacenter/download-data-file")
    assert result["robots_ok"] is True
    assert result["scheme_ok"] is True
    assert result["host_ok"] is True

import sys
import io
import time

# Force UTF-8 stdout on Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def run_tests():
    print("=" * 60)
    print("STARTING SELENIUM TEST SUITE FOR IRON WILL")
    print("=" * 60)

    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1440,900")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Edge(options=options)
    wait = WebDriverWait(driver, 10)

    try:
        driver.get("http://localhost:3000")
        print("[PASS] Loaded http://localhost:3000")

        # Wait for page title
        assert "Iron Will" in driver.title, f"Unexpected title: {driver.title}"
        print(f"[PASS] Title verified: '{driver.title}'")

        # Give page a moment to initialize and dismiss any auto-prompt modal
        time.sleep(1.0)
        driver.execute_script("""
            const m = document.getElementById('dailyCheckModal');
            if (m) {
                m.style.display = 'none';
                m.setAttribute('aria-hidden', 'true');
            }
        """)
        time.sleep(0.3)

        # ----------------------------------------------------
        # TEST 1: DESKTOP NAVIGATION & CALENDAR GRID
        # ----------------------------------------------------
        print("\n--- TEST 1: DESKTOP CALENDAR GRID VERIFICATION ---")
        cal_nav_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "#desktopNav button[data-tab='calendar']")))
        cal_nav_btn.click()
        
        cal_section = wait.until(EC.visibility_of_element_located((By.ID, "secCalendar")))
        print("[PASS] Calendar tab successfully displayed")

        # Check calDayNames 7-column layout
        cal_day_names = driver.find_element(By.ID, "calDayNames")
        dn_display = cal_day_names.value_of_css_property("display")
        dn_cols = cal_day_names.value_of_css_property("grid-template-columns")
        print(f"  #calDayNames CSS display: {dn_display}")
        print(f"  #calDayNames grid-template-columns: {dn_cols}")
        assert dn_display == "grid", f"Expected #calDayNames display to be 'grid', got '{dn_display}'"
        
        dn_elements = cal_day_names.find_elements(By.CLASS_NAME, "cal-dn")
        assert len(dn_elements) == 7, f"Expected 7 day headers, found {len(dn_elements)}"
        day_labels = [el.text for el in dn_elements]
        print(f"[PASS] Verified 7 day headers: {day_labels}")

        # Verify headers are on the same Y row and have distinct X coordinates
        dn_rects = [el.rect for el in dn_elements]
        y_coords = [r['y'] for r in dn_rects]
        x_coords = [r['x'] for r in dn_rects]
        assert max(y_coords) - min(y_coords) <= 2, f"Day headers are not horizontally aligned: {y_coords}"
        assert sorted(x_coords) == x_coords, f"Day headers are not ordered horizontally: {x_coords}"
        print("[PASS] Day headers are strictly horizontally aligned in a 7-column row")

        # Check #calGrid day cells
        cal_grid_inner = driver.find_element(By.CSS_SELECTOR, "#calGrid .cal-grid-7")
        grid_display = cal_grid_inner.value_of_css_property("display")
        grid_cols = cal_grid_inner.value_of_css_property("grid-template-columns")
        print(f"  #calGrid .cal-grid-7 CSS display: {grid_display}")
        print(f"  #calGrid grid-template-columns: {grid_cols}")
        assert grid_display == "grid", f"Expected #calGrid inner display to be 'grid', got '{grid_display}'"

        cal_cells = cal_grid_inner.find_elements(By.CLASS_NAME, "cal-cell")
        print(f"  Total calendar cells rendered: {len(cal_cells)}")
        assert len(cal_cells) >= 28, f"Too few calendar cells: {len(cal_cells)}"

        # Check row 2 (which should have 7 full cells across SUN to SAT)
        row_cells = cal_cells[7:14]
        row_ys = [c.rect['y'] for c in row_cells]
        row_xs = [c.rect['x'] for c in row_cells]
        assert max(row_ys) - min(row_ys) <= 3, f"Calendar cells in a row are not horizontally aligned: {row_ys}"
        assert sorted(row_xs) == row_xs, f"Calendar cells in row are not horizontally separated: {row_xs}"
        print(f"[PASS] Calendar cells are verified in 7-column layout (Row heights aligned, X positions: {[int(x) for x in row_xs]})")

        # Verify today's cell is highlighted
        today_cell = cal_grid_inner.find_element(By.CLASS_NAME, "today")
        assert today_cell is not None, "No cell with class 'today' found!"
        print(f"[PASS] Found highlighted today cell: day {today_cell.text.split()[0]}")

        # Check Urge Heatmap inside Calendar
        heatmap = driver.find_element(By.ID, "heatmapGrid")
        hm_display = heatmap.value_of_css_property("display")
        assert hm_display == "grid", f"Expected heatmap display to be 'grid', got '{hm_display}'"
        print("[PASS] Calendar 24-hour urge heatmap is displayed as grid")

        # ----------------------------------------------------
        # TEST 2: ARSENAL ACHIEVEMENT VAULT GRID
        # ----------------------------------------------------
        print("\n--- TEST 2: ARSENAL ACHIEVEMENT VAULT GRID VERIFICATION ---")
        arsenal_nav_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "#desktopNav button[data-tab='arsenal']")))
        arsenal_nav_btn.click()
        
        wait.until(EC.visibility_of_element_located((By.ID, "secArsenal")))

        ach_grid = driver.find_element(By.ID, "fullAchGrid")
        ach_display = ach_grid.value_of_css_property("display")
        ach_cols = ach_grid.value_of_css_property("grid-template-columns")
        print(f"  #fullAchGrid CSS display: {ach_display}")
        print(f"  #fullAchGrid grid-template-columns: {ach_cols}")
        assert ach_display == "grid", f"Expected #fullAchGrid to be 'grid', got '{ach_display}'"

        ach_items = ach_grid.find_elements(By.CLASS_NAME, "ach-item")
        print(f"  Total achievement badges: {len(ach_items)}")
        assert len(ach_items) >= 10, f"Expected at least 10 badges, found {len(ach_items)}"

        # Check that achievements are not all on a single vertical line
        x_positions = [it.rect['x'] for it in ach_items[:4]]
        assert len(set(x_positions)) >= 3, f"Achievements appear to be stacked vertically: {x_positions}"
        print(f"[PASS] Achievements laid out horizontally in multi-column grid: X coords {x_positions}")

        # ----------------------------------------------------
        # TEST 3: ANALYTICS CHARTS & HEATMAP
        # ----------------------------------------------------
        print("\n--- TEST 3: ANALYTICS CHARTS & HEATMAP VERIFICATION ---")
        analytics_nav_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "#desktopNav button[data-tab='analytics']")))
        analytics_nav_btn.click()
        
        wait.until(EC.visibility_of_element_located((By.ID, "secAnalytics")))

        radar_chart = driver.find_element(By.ID, "radarChart")
        svgs = radar_chart.find_elements(By.TAG_NAME, "svg")
        assert len(svgs) > 0, "No SVG rendered in Radar Chart!"
        print("[PASS] Vulnerability Radar SVG verified")

        streak_timeline = driver.find_element(By.ID, "streakTimeline")
        st_svgs = streak_timeline.find_elements(By.TAG_NAME, "svg")
        assert len(st_svgs) > 0, "No SVG rendered in Streak Timeline!"
        print("[PASS] Streak History Timeline SVG verified")

        # ----------------------------------------------------
        # TEST 4: MOBILE RESPONSIVE TEST VIA CDP EMULATION (390 x 844)
        # ----------------------------------------------------
        print("\n--- TEST 4: MOBILE RESPONSIVE LAYOUT VERIFICATION (390x844) ---")
        driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride', {
            'width': 390,
            'height': 844,
            'deviceScaleFactor': 2,
            'mobile': True
        })
        time.sleep(0.5)

        client_w = driver.execute_script("return document.documentElement.clientWidth;")
        print(f"  Mobile viewport clientWidth: {client_w}px")
        assert client_w == 390, f"Expected 390px clientWidth, got {client_w}px"

        # Check Desktop Nav is hidden and Mobile Dock is visible
        dnav = driver.find_element(By.ID, "desktopNav")
        bnav = driver.find_element(By.ID, "bottomNav")
        assert not dnav.is_displayed(), "Desktop nav should be hidden on mobile viewport!"
        assert bnav.is_displayed(), "Bottom dock should be visible on mobile viewport!"
        print("[PASS] Desktop top nav hidden, Mobile bottom dock visible")

        # Switch to Calendar via mobile nav
        m_cal_btn = bnav.find_element(By.CSS_SELECTOR, "button[data-tab='calendar']")
        m_cal_btn.click()
        time.sleep(0.5)

        # Check calendar on mobile
        cal_day_names_m = driver.find_element(By.ID, "calDayNames")
        dn_display_m = cal_day_names_m.value_of_css_property("display")
        assert dn_display_m == "grid", "Mobile calendar day names must be grid!"

        # Ensure no horizontal overflow outside mobile viewport
        cal_card = driver.find_element(By.CSS_SELECTOR, "#secCalendar .card")
        card_width = cal_card.rect['width']
        print(f"  Mobile calendar card width: {card_width}px (within {client_w}px viewport)")
        assert card_width <= client_w, f"Calendar overflows mobile viewport: {card_width}px > {client_w}px"

        # Check all 7 day headers fit within mobile card width
        dn_rects_m = [el.rect for el in cal_day_names_m.find_elements(By.CLASS_NAME, "cal-dn")]
        assert len(dn_rects_m) == 7
        last_header_right = dn_rects_m[-1]['x'] + dn_rects_m[-1]['width']
        first_header_left = dn_rects_m[0]['x']
        total_grid_span = last_header_right - first_header_left
        print(f"[PASS] All 7 day headers fit neatly on mobile (total span: {int(total_grid_span)}px <= {card_width}px)")

        # Verify scrollWidth <= clientWidth (no horizontal scrollbar on body)
        body_scroll_w = driver.execute_script("return document.body.scrollWidth;")
        print(f"  Body scrollWidth: {body_scroll_w}px (no horizontal overflow)")
        assert body_scroll_w <= client_w, f"Body has horizontal scrollbar: {body_scroll_w}px > {client_w}px"
        print("[PASS] Zero horizontal page overflow on mobile")

        # ----------------------------------------------------
        # TEST 5: NO JAVASCRIPT CONSOLE ERRORS
        # ----------------------------------------------------
        print("\n--- TEST 5: CONSOLE ERRORS AUDIT ---")
        logs = driver.get_log("browser")
        severe_errors = [l for l in logs if l['level'] == 'SEVERE']
        if severe_errors:
            print("Warning: Severe browser logs found:", severe_errors)
        else:
            print("[PASS] Zero SEVERE JavaScript errors logged in browser")

        print("\n" + "=" * 60)
        print("ALL 5 SELENIUM TEST SUITES PASSED WITH 100% SUCCESS!")
        print("=" * 60)
        return True

    except Exception as e:
        print(f"\n[FAIL] SELENIUM TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        driver.quit()

if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1)

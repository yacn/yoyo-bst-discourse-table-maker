var $TABLE = $('#table');
var $BTN = $('#export-btn');
var $EXPORT = $('#export');
var $SAVE = $('#save-btn');
var $LOAD = $('#load-btn');

clickFns = new Map([
  ['.table-add', addRow],
  ['.table-remove', removeRow],
  ['.table-up', moveRowUp],
  ['.table-down', moveRowDown],
]);

ROW_STATUSES = new Map();

function setupHandlers() {
  $('[contenteditable]')
    .focus(function() {
      $(this).data("contents", $(this).text())
      var el = this;
      requestAnimationFrame(function() {
        selectElementContents(el);
      });
    });
  $('[contenteditable]')
    .blur(function() {
      if ($(this).data("contents") !== $(this).text()) {
        console.log("Table cell changed, autosaving");
        saveTable();
      }
    });
  $('[contenteditable]')
    .keyup(function(e) {
      if (e.which == 13) { // Enter key
        $(this).blur();
      }
    });
  $('[contenteditable]')
    .keypress(function(e) { return e.which != 13 });
  $('select').change(function() {
    row_identifier= $(this).parents('tr').attr('class');
    console.log("status field changed in row " + row_identifier + " to " + $(this).val());
    ROW_STATUSES.set(row_identifier, $(this).val());
    saveTable();
  });
  setOnClicks();
}

function setOnClicks() {
  console.log("setting on-click functions");
  for (const [id, fn] of clickFns) {
    $(id).click(fn);
  }
}

$(window).on("load", function() {
  loadTable();
});

function setRowStatuses() {
  ROW_STATUSES.forEach(function(status_, row_identifier) {
    console.log('setting ' + row_identifier + ' to ' + status_);
    console.log($('.' + row_identifier).children('status'));
    $('.' + row_identifier).find('#status').val(status_);//.change();
  });
}

function loadTable(k = 'tableHTML') {
  table_state = localStorage.getItem(k);
  if (table_state !== null) {
    console.log("loaded table state " + k);
    ROW_STATUSES = new Map(JSON.parse(localStorage.getItem('statuses_' + k)));
    $TABLE.html(table_state)
    setRowStatuses();
  } else {
    console.log("no state to load");
  }
  setupHandlers();
}

$LOAD.click(function() {
  console.log("loading manually saved table state");
  loadTable('tableHTML_manual');
});

$SAVE.click(function() {
  console.log("manually saving table state");
  saveTable('tableHTML_manual');
});

function selectElementContents(el) {
  var range = document.createRange();
  range.selectNodeContents(el);
  var sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function saveTable(k = 'tableHTML') {
  localStorage.setItem(k, $TABLE.html());
  localStorage.setItem('statuses_' + k, JSON.stringify(Array.from(ROW_STATUSES)));
}

function addRow() {
  row_identifier = "row-" + (new Date()).getTime();
  console.log("adding " + row_identifier);
  var $clone = $TABLE.find('tr.hide').clone(true).removeClass('hide table-line');
  $clone.addClass(row_identifier)
  $TABLE.find('table').append($clone);
  ROW_STATUSES.set(row_identifier, ":white_check_mark:");
  saveTable();
}

function removeRow() {
  row_identifier = $(this).parents('tr').attr('class');
  console.log("removing " + row_identifier);
  $(this).parents('tr').detach();
  ROW_STATUSES.delete(row_identifier);
  saveTable();
}

function moveRowUp() {
  console.log("moving row up");
  var $row = $(this).parents('tr');
  if ($row.index() === 1) return; // Don't go above the header
  $row.prev().before($row.get(0));
  saveTable();
}

function moveRowDown() {
  console.log("moving row down");
  var $row = $(this).parents('tr');
  $row.next().after($row.get(0));
  saveTable();
}

// A few jQuery helpers for exporting only
jQuery.fn.pop = [].pop;
jQuery.fn.shift = [].shift;

$BTN.click(function () {
  var $rows = $TABLE.find('tr:not(:hidden)');
  var headers = [];
  var data = [];
  
  // Get the headers (add special header logic here)
  $($rows.shift()).find('th:not(:empty)').each(function () {
    headers.push($(this).text().toLowerCase());
  });
  
  // Turn all existing rows into a loopable array
  $rows.each(function () {
    var $td = $(this).find('td');
    var h = {};
    
    // Use the headers from earlier to name our hash keys
    headers.forEach(function (header, i) {
      var elem = $td.eq(i);
      var val = elem.text();
      console.log("header: " + header);
      if (header === "status") {
        val = elem.find(":selected").val();
      } 
      console.log("val: " + val);
      h[header] = val
    });
    
    data.push(h);
  });

  var mkdwn_header = "|";
  var header_separator_row = "|";
  for (const header of headers) {
    header_section = " " + header + " |";
    mkdwn_header += header_section;
    header_separator_row += " --- |";
  }

  var mkdwn_table = [
    ":white_check_mark: = Available, :x: = sold, :hourglass_flowing_sand: = pending",
    mkdwn_header,
    header_separator_row
  ];

  for (const row of data) {
    mkdwn_row = "|";
    for (const val of Object.values(row)) {
      mkdwn_row += " " + val + " |";
    }
    mkdwn_table.push(mkdwn_row)
  }

  
  // Output the result
  $EXPORT.html(mkdwn_table.join("<br />"));
  $('#markdown').removeClass('hide');
  localStorage.setItem('JSONtableHTML', JSON.stringify(data));
});

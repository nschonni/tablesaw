/*
* tablesaw: A set of plugins for responsive tables
* Stack and Column Toggle tables
* Copyright (c) 2013 Filament Group, Inc.
* MIT License
*/

;(function( $ ) {
	var o = {
		pluginName : "table",
		classes : {
			stackTable: "tablesaw-stack",
			cellLabels: "tablesaw-cell-label",
			popup: "tablesaw-columntoggle-popup",
			columnBtnContain: "tablesaw-columntoggle-btnwrap tablesaw-advance",
			columnBtn: "tablesaw-columntoggle-btn tablesaw-nav-btn",
			priorityPrefix: "tablesaw-priority-",
			columnToggleTable: "tablesaw-columntoggle",
			dialogClass: "",
			toolbar: "tablesaw-bar"
		},
		events: {
			create: "tablesawcreate",
			destroy: "tablesawdestroy"
		},
		columnsDialogError: 'No eligible columns.',
		columnBtnText: "Columns",
		mode: "stack",
		initSelector: "table[data-mode],table[data-sortable]",
		columnBtnSide: "right"
	},
	methods = {
		_create: function() {
			var self = this,
				$table = $(this);

			// override the mode if defined (this could be broader if needed)
			if( $(this).is( "[data-mode]" ) ){
				o.mode = $(this).attr( "data-mode" );
			}

			if( $table.is( "[data-column-btn-side]" ) ){
				o.columnBtnSide = $table.attr( "data-column-btn-side" );
			}

			if( $table.is( "[data-dialog-class]" ) ){
				o.classes.dialogClass = $table.attr( "data-dialog-class" );
			}

			// Insert the toolbar
			var $toolbar = $table.prev( '.' + o.classes.toolbar );
			if( !$toolbar.length ) {
				$toolbar = $( '<div>' )
					.addClass( o.classes.toolbar )
					.insertBefore( $table );
			}

			if( o.mode ) {
				$toolbar.addClass( 'mode-' + o.mode );
			}

			// Expose headers and allHeaders properties on the widget
			// headers references the THs within the first TR in the table
			this.headers = $table.find( "tr:first > th" );
			// allHeaders references headers, plus all THs in the thead, which may include several rows, or not
			this.allHeaders = this.querySelectorAll( "th" );

			var thrs = this.querySelectorAll( "thead tr" );
			$( thrs ).each( function(){
				var coltally = 0;

				$( this ).children().each( function(){
					var span = parseInt( this.getAttribute( "colspan" ), 10 ),
						sel = ":nth-child(" + ( coltally + 1 ) + ")";

					self.colstart = coltally + 1;

					if( span ){
						for( var k = 0; k < span - 1; k++ ){
							coltally++;
							sel += ", :nth-child(" + ( coltally + 1 ) + ")";
						}
					}

					// Store "cells" data on header as a reference to all cells in the same column as this TH
					this.cells = $( self ).find("tr").not($( thrs ).eq(0)).not(this).children(sel);
					coltally++;

				});
			});

			if( o.mode === "stack" || o.mode === "columntoggle" ){
				$table[ o.pluginName ]( o.mode, self );
			}
			$table.trigger( o.events.create, [ o.mode ] );
		},

		destroy: function() {
			var $t = $( this );
			$t.removeAttr( 'data-mode' );

			// stack
			$t.removeClass( o.classes.stackTable );
			$t.find( '.' + o.classes.cellLabels ).remove();

			// columntoggle
			$t.removeClass( o.classes.columnToggleTable );
			$t.find( 'th, td' ).each(function() {
				var $cell = $( this );
				$cell.removeClass( 'tablesaw-cell-hidden' )
					.removeClass( 'tablesaw-cell-visible' );

				this.className = this.className.replace( /\bui\-table\-priority\-\d\b/g, '' );
			});

			// Don’t remove the toolbar. Some of the table features are not yet destroy-friendly.
			$t.prev( '.' + o.classes.toolbar ).each(function() {
				this.className = this.className.replace( /\bmode\-\w*\b/gi, '' );
			});

			$( window ).off( 'resize.' + $t.attr( 'id' ) );

			// other plugins
			$t.trigger( o.events.destroy );

			$t.removeData( o.pluginName + 'active' );
		},

		stack: function( self ) {
			var table = this,
				setClass = this.getAttribute( "class" ) + " " + o.classes.stackTable;

			// If it's not stack mode, return here.
			if( o.mode !== "stack" ){
				return;
			}

			table.setAttribute( "class", setClass );

			// get headers in reverse order so that top-level headers are appended last

			var reverseHeaders = $( this.allHeaders );

			// create the hide/show toggles
			reverseHeaders.each(function(){
				var $cells = $( this.cells ),
					colstart = self.colstart,
					hierarchyClass = $cells.not( this ).filter( "thead th" ).length && " tablesaw-cell-label-top",
					text = $(this).text();

				if( text !== ""  ){

					if( hierarchyClass ){
						var iteration = parseInt( $( this ).attr( "colspan" ), 10 ),
							filter = "";

						if( iteration ){
							filter = "td:nth-child("+ iteration +"n + " + ( colstart ) +")";
						}
						$cells.filter( filter ).prepend( "<b class='" + o.classes.cellLabels + hierarchyClass + "'>" + text + "</b>"  );
					}
					else {
						$cells.prepend( "<b class='" + o.classes.cellLabels + "'>" + text + "</b>"  );
					}
				}
			});
		},

		columntoggle: function(){


			var tableId,
				id,
				$menuButton,
				$popup,
				$menu,
				$btnContain,
				$table = $( this ),
				self = this,
				menuInputChange = function(e) {
					var checked = e.target.checked;

					$( e.target ).data( "cells" )
						.toggleClass( "tablesaw-cell-hidden", !checked )
						.toggleClass( "tablesaw-cell-visible", checked );

					$table.trigger( 'tablesawcolumns' );
				};

			// assign an id if there is none
			if ( !$table.attr( "id" ) ) {
				$table.attr( "id", o.pluginName + "-" + Math.round( Math.random() * 10000 ) );
			}

			$table.addClass( o.classes.columnToggleTable );

			tableId = $table.attr( "id" );
			id = tableId + "-popup";
			$btnContain = $( "<div class='" + o.classes.columnBtnContain + " " + o.columnBtnSide + " " + o.classes.dialogClass + "'></div>" );
			$menuButton = $( "<a href='#" + id + "' class='btn btn-micro " + o.classes.columnBtn +"' data-popup-link>" +
											"<span>" + o.columnBtnText + "</span></a>" );
			$popup = $( "<div class='dialog-table-coltoggle " + o.classes.popup + "' id='" + id + "'></div>" );
			$menu = $( "<div class='btn-group'></div>" );

			var hasNonPersistentHeaders = false;
			$(this.headers).not( "td" ).each( function() {
				var $this = $( this ),
					priority = $this.attr("data-priority"),
					$cells = $this.add( this.cells );

				if( priority && priority !== "persist" ) {
					$cells.addClass( o.classes.priorityPrefix + priority );

					$("<label class='btn btn-check btn-checkbox btn-selected theme-simple'><input type='checkbox' checked>" + $this.text() + "</label>" )
						.appendTo( $menu )
						.trigger('enhance')
						.children( 0 )
						.data( "cells", $cells );

					hasNonPersistentHeaders = true;
				}
			});

			if( !hasNonPersistentHeaders ) {
				$menu.append( '<label class="btn theme-simple">' + o.columnsDialogError + '</label>' );
			}

			$menu.find( '.btn' ).tablesawbtn();
			$menu.appendTo( $popup );

			// bind change event listeners to inputs - TODO: move to a private method?
			$menu.on( "change", menuInputChange );

			$menuButton.appendTo( $btnContain );

			$btnContain.appendTo( $table.prev( '.' + o.classes.toolbar ) );

			$popup
				.appendTo( $btnContain )
				.dialog( true );

			// refresh method

			$(window).on( "resize." + tableId, function(){
				$table[ o.pluginName ]( "refreshToggle", self );
			} );

			$.extend( this, {
				_menu: $menu,
				_menuInputChange: menuInputChange
			});

			$(this)[ o.pluginName ]( "refreshToggle", self );
		},

		refreshPriority: function(){
			$(this.headers).not( "td" ).each( function() {
				var $this = $( this ),
					priority = $this.attr("data-priority"),
					$cells = $this.add( this.cells );

				if( priority && priority !== "persist" ) {
					$cells.addClass( o.classes.priorityPrefix + priority );
				} else {
					$cells.each(function() {
						// remove all priority classes.
						this.className = this.className.replace( /\bui\-table\-priority\-\d\b/g, '' );
					});
				}
			});
		},

		refreshToggle: function(){
			this._menu.find( "input" ).each( function() {
				var $this = $( this );

				this.checked = $this.data( "cells" ).eq( 0 ).css( "display" ) === "table-cell";

				$this.parent()[ this.checked ? "addClass" : "removeClass" ]( "btn-selected" );
			});
		}
	};

	// Collection method.
	$.fn[ o.pluginName ] = function( arrg, a, b, c ) {
		return this.each(function() {

			// if it's a method
			if( arrg && typeof( arrg ) === "string" ){
				return $.fn[ o.pluginName ].prototype[ arrg ].call( this, a, b, c );
			}

			// don't re-init
			if( $( this ).data( o.pluginName + "active" ) ){
				return $( this );
			}

			// otherwise, init
			$( this ).data( o.pluginName + "active", true );
			$.fn[ o.pluginName ].prototype._create.call( this );
		});
	};

	// add methods
	$.extend( $.fn[ o.pluginName ].prototype, methods );

	$( document ).on( "enhance.tablesaw", function( e ) {
		$( e.target ).find( o.initSelector )[ o.pluginName ]();
	});

}( jQuery ));
/**
 * Extends the Cover block with an archive featured image source setting.
 *
 * @package WE_Cover_Featured_Everywhere
 */

import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const ATTRIBUTE_NAME = 'weArchiveFeaturedSource';

addFilter(
	'blocks.registerBlockType',
	'we-cover-featured-everywhere/cover-attribute',
	( settings, name ) => {
		if ( 'core/cover' !== name ) {
			return settings;
		}

		return {
			...settings,
			attributes: {
				...settings.attributes,
				[ ATTRIBUTE_NAME ]: {
					type: 'string',
					default: 'off',
				},
			},
		};
	}
);

const withArchiveFeaturedSourceControl = createHigherOrderComponent(
	( BlockEdit ) =>
		( props ) => {
			if ( 'core/cover' !== props.name ) {
				return <BlockEdit { ...props } />;
			}

			const { attributes, setAttributes } = props;

			if ( ! attributes.useFeaturedImage ) {
				return <BlockEdit { ...props } />;
			}

			return (
				<>
					<BlockEdit { ...props } />
					<InspectorControls>
						<PanelBody
							title={ __(
								'Archive featured image',
								'we-cover-featured-everywhere'
							) }
							initialOpen={ true }
						>
							<SelectControl
								label={ __(
									'Image source on list views',
									'we-cover-featured-everywhere'
								) }
								value={ attributes[ ATTRIBUTE_NAME ] || 'off' }
								options={ [
									{
										label: __(
											'Disabled',
											'we-cover-featured-everywhere'
										),
										value: 'off',
									},
									{
										label: __(
											'First listed post',
											'we-cover-featured-everywhere'
										),
										value: 'first',
									},
									{
										label: __(
											'Random from current page',
											'we-cover-featured-everywhere'
										),
										value: 'random',
									},
									{
										label: __(
											'Random from entire archive',
											'we-cover-featured-everywhere'
										),
										value: 'random_archive',
									},
								] }
								onChange={ ( value ) =>
									setAttributes( { [ ATTRIBUTE_NAME ]: value } )
								}
								help={ __(
									'Applies on blog home, archives, and search results when no post context is available. Choose Disabled for covers that contain their own query loops.',
									'we-cover-featured-everywhere'
								) }
							/>
						</PanelBody>
					</InspectorControls>
				</>
			);
		},
	'withArchiveFeaturedSourceControl'
);

addFilter(
	'editor.BlockEdit',
	'we-cover-featured-everywhere/cover-inspector-control',
	withArchiveFeaturedSourceControl
);

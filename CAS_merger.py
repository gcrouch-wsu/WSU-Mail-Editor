import pandas as pd
import os
import datetime
import logging
import traceback
import sys
from tkinter import Tk, filedialog
from openpyxl import Workbook
from openpyxl.utils.dataframe import dataframe_to_rows

# Set up logging
logging.basicConfig(filename='excel_merger.log', level=logging.DEBUG, 
                    format='%(asctime)s - %(levelname)s - %(message)s')

def exception_handler(exc_type, exc_value, exc_traceback):
    logging.error("Uncaught exception", exc_info=(exc_type, exc_value, exc_traceback))

sys.excepthook = exception_handler

def convert_to_text(value, column_name):
    if pd.isna(value):
        return 'N/A' if column_name in ['Standardized Test Score Requirement', 'Accepted English Language Tests'] else ''
    elif isinstance(value, (datetime.datetime, datetime.date)):
        return value.strftime('%m/%d/%y')
    else:
        return str(value)

def clean_program_id(df):
    if 'Program ID' in df.columns:
        df['Program ID'] = df['Program ID'].astype(str).str.strip()
    return df

def merge_excel_sheets(file_path):
    sheets_and_columns = {
        'Program Attributes': ['Program ID', 'Application Deadline', 'Application Type', 'Campus', 'Deadline',
                               'Delivery', 'Full-Time/Part-Time', 'Open Date', 'Program', 'Start Term',
                               'Start Year', 'Status', 'Updated Date', 'Standardized Test Score Requirement',
                               'Accepted English Language Tests'],
        'Recommendations': ['Program ID', 'Evaluation Type', 'Max', 'Min',
                            'Minimum Required for Application to be submitted for review'],
        'Questions': ['Program ID', 'Question', 'Question Block', 'Question Type', 'Required'],
        'Answers': ['Program ID', 'Answer Value'],
        'Documents': ['Program ID', 'Application Instructions', 'Document Type', 'Max', 'Min']
    }

    dataframes = {}

    for sheet_name, columns in sheets_and_columns.items():
        print(f"Processing sheet: {sheet_name}")
        logging.info(f"Processing sheet: {sheet_name}")
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            df = clean_program_id(df)
            print(f"Read {sheet_name} sheet. Shape: {df.shape}")
            logging.info(f"Read {sheet_name} sheet. Shape: {df.shape}")

            if 'Program ID' not in df.columns:
                print(f"Warning: 'Program ID' not found in {sheet_name}. Skipping this sheet.")
                logging.warning(f"'Program ID' not found in {sheet_name}. Skipping this sheet.")
                continue

            for col in columns:
                if col not in df.columns:
                    df[col] = ''

            df = df.loc[:, columns]
            
            if sheet_name == 'Recommendations':
                df = df.rename(columns={'Max': 'Max Evaluations', 'Min': 'Min Evaluations'})
            elif sheet_name == 'Documents':
                df = df.rename(columns={'Max': 'Max Documents', 'Min': 'Min Documents'})
            
            for col in df.columns:
                df[col] = df[col].apply(lambda x: convert_to_text(x, col))
            
            dataframes[sheet_name] = df
        except PermissionError:
            print(f"Permission denied: Unable to access {file_path}. Please ensure the file is closed and try again.")
            logging.error(f"Permission denied: Unable to access {file_path}.")
            return None
        except Exception as e:
            print(f"Error processing sheet {sheet_name}: {str(e)}")
            logging.error(f"Error processing sheet {sheet_name}: {str(e)}")

    if 'Program Attributes' not in dataframes:
        raise KeyError("The 'Program Attributes' sheet is missing or could not be processed.")

    main_df = dataframes['Program Attributes']

    for sheet_name, df in dataframes.items():
        if sheet_name == 'Program Attributes':
            continue

        main_df = pd.merge(main_df, df, on='Program ID', how='left', suffixes=('', f'_{sheet_name}'))

        print(f"Merged {sheet_name}. New shape: {main_df.shape}")
        logging.info(f"Merged {sheet_name}. New shape: {main_df.shape}")

    main_df.fillna('', inplace=True)

    return main_df

def save_as_text_excel(df, output_file_path):
    wb = Workbook()
    ws = wb.active
    ws.title = "Merged Data"

    df = df.astype(str)

    for r in dataframe_to_rows(df, index=False, header=True):
        ws.append(r)

    for row in ws.iter_rows():
        for cell in row:
            cell.number_format = '@'

    wb.save(output_file_path)

def main():
    try:
        Tk().withdraw()  # Hide the main Tkinter window
        file_path = filedialog.askopenfilename(title="Select the input Excel file", filetypes=[("Excel files", "*.xlsx")])
        
        if not file_path:
            raise FileNotFoundError("No file selected.")
        
        print(f"Selected file: {file_path}")
        logging.info(f"Selected file: {file_path}")

        result = merge_excel_sheets(file_path)

        if result is None:
            return

        # Check DataFrame content
        print("DataFrame content before saving:")
        print(result.head())

        # Generate the output file path
        base_name = os.path.splitext(os.path.basename(file_path))[0]
        current_time = datetime.datetime.now().strftime("%m.%d.%y %I.%M %p")
        output_file_name = f"{base_name}_merged_{current_time}.xlsx"
        output_file_path = os.path.join(os.path.dirname(file_path), output_file_name)
        
        print(f"Saving merged data to: {output_file_path}")
        logging.info(f"Saving merged data to: {output_file_path}")
        print(f"DataFrame shape before saving: {result.shape}")
        logging.info(f"DataFrame shape before saving: {result.shape}")

        save_as_text_excel(result, output_file_path)

        if os.path.exists(output_file_path):
            file_size = os.path.getsize(output_file_path)
            print(f"File created. Size: {file_size} bytes")
            logging.info(f"File created. Size: {file_size} bytes")
            if file_size == 0:
                raise ValueError("Output file is empty (0 bytes)")
            else:
                print(f"Merged data saved successfully to: {output_file_path}")
                logging.info(f"Merged data saved successfully to: {output_file_path}")
                print(f"Output file path: {output_file_path}")
        else:
            raise FileNotFoundError(f"Failed to create output file: {output_file_path}")

        print("Opening folder containing the output file...")
        logging.info("Opening folder containing the output file...")
        os.startfile(os.path.dirname(output_file_path))

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        print("Detailed error information:")
        print(traceback.format_exc())
        logging.error(f"An error occurred: {str(e)}")
        logging.error("Detailed error information:")
        logging.error(traceback.format_exc())

    finally:
        print("Script execution completed. Check excel_merger.log for details.")
        logging.info("Script execution completed.")

if __name__ == "__main__":
    main()
    print("Press Enter to exit...")
    input()
